import { NextRequest } from 'next/server'

// 确保环境变量已设置
const getHuggingFaceToken = () => {
  const token = process.env.HUGGINGFACE_API_TOKEN
  if (!token) {
    console.error('HUGGINGFACE_API_TOKEN environment variable is not set')
    throw new Error('API configuration error. Please contact support.')
  }
  return token
}

// 添加超时控制的 fetch 函数
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 25000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    throw error
  }
}

async function generateImage(prompt: string, retryCount = 0): Promise<ArrayBuffer> {
  try {
    const response = await fetchWithTimeout(
      'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getHuggingFaceToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
        }),
      },
      25000 // 25秒超时，给其他操作留出时间
    )

    if (!response.ok) {
      let errorText = await response.text()
      
      // 处理不同类型的错误
      if (response.status === 503 && errorText.includes('loading') && retryCount < 2) {
        // 模型加载中，最多重试2次
        const errorData = JSON.parse(errorText)
        const waitTime = Math.min(errorData.estimated_time || 10, 10) * 1000
        console.log(`Model loading, waiting ${waitTime/1000}s before retry ${retryCount + 1}/2`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        return generateImage(prompt, retryCount + 1)
      } else if (response.status === 429 && retryCount < 2) {
        // 速率限制，最多重试2次
        const waitTime = 10000 // 等待10秒
        console.log(`Rate limited, waiting ${waitTime/1000}s before retry ${retryCount + 1}/2`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        return generateImage(prompt, retryCount + 1)
      }

      throw new Error(`API Error (${response.status}): ${errorText}`)
    }

    return response.arrayBuffer()
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      if (retryCount < 1) {
        // 处理网络错误，最多重试1次
        const waitTime = 5000 // 固定等待5秒
        console.log(`Network error, waiting ${waitTime/1000}s before retry ${retryCount + 1}/1`)
        console.error(error)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        return generateImage(prompt, retryCount + 1)
      }
    }
    throw error
  }
}

// 设置最大执行时间为 60 秒（Vercel Hobby 计划的限制）
export const maxDuration = 60

export async function POST(request: NextRequest) {
  console.log('API route called')
  
  try {
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return Response.json(
        { error: 'Content-Type must be application/json' },
        { status: 415 }
      )
    }

    const { text } = await request.json()

    if (!text) {
      return Response.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    console.log('Starting image generation with text:', text)

    // 减少生成的帧数以适应时间限制
    const numFrames = 4 // 从8帧减少到4帧
    const frames = []

    for (let i = 0; i < numFrames; i++) {
      const framePrompt = `${text}, frame ${i + 1} of a sequence`
      console.log(`Generating frame ${i + 1}/${numFrames}`)

      try {
        const imageBuffer = await generateImage(framePrompt)
        
        // 将 ArrayBuffer 转换为 base64
        const uint8Array = new Uint8Array(imageBuffer)
        let binary = ''
        for (let j = 0; j < uint8Array.length; j++) {
          binary += String.fromCharCode(uint8Array[j])
        }
        const base64 = Buffer.from(binary, 'binary').toString('base64')
        
        frames.push(base64)
        
        // 减少帧之间的延迟
        if (i < numFrames - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // 从3秒减少到1秒
        }
      } catch (error) {
        console.error(`Error generating frame ${i + 1}:`, error)
        throw error
      }
    }

    console.log('All frames generated')

    return Response.json({ 
      output: frames,
      type: 'image-sequence'
    })
  } catch (error) {
    console.error('Error in generation:', error)
    
    // 根据错误类型返回适当的错误信息
    let errorMessage = 'Failed to generate content'
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message.includes('API configuration error')) {
        statusCode = 503
        errorMessage = 'Service temporarily unavailable'
      } else if (error.message.includes('timeout')) {
        statusCode = 504
        errorMessage = 'Request timeout'
      } else if (error.message.includes('Rate limited')) {
        statusCode = 429
        errorMessage = 'Too many requests'
      }
    }

    return Response.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
      },
      { status: statusCode }
    )
  }
}
