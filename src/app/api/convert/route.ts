import { NextRequest } from 'next/server'

// 确保环境变量已设置
const getHuggingFaceToken = () => {
  console.log('Checking HuggingFace API token...')
  const token = process.env.HUGGINGFACE_API_TOKEN
  if (!token) {
    console.error('HUGGINGFACE_API_TOKEN environment variable is not set')
    throw new Error('API configuration error. Please contact support.')
  }
  // 验证 token 格式
  if (!token.startsWith('hf_') || token.length < 10) {
    console.error('Invalid HuggingFace API token format')
    throw new Error('Invalid API token format. Please check your configuration.')
  }
  console.log('HuggingFace API token is valid')
  return token
}

// 添加超时控制的 fetch 函数
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 25000) {
  console.log(`Making request to ${url} with timeout ${timeout}ms`)
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(id)
    console.log(`Response received with status: ${response.status}`)
    return response
  } catch (error) {
    clearTimeout(id)
    console.error('Fetch error:', error)
    throw error
  }
}

// 添加延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function generateImage(prompt: string, retryCount = 0, waitTime = 0): Promise<ArrayBuffer> {
  if (waitTime > 0) {
    console.log(`Waiting ${waitTime/1000} seconds before attempting generation...`)
    await delay(waitTime)
  }

  console.log(`Generating image for prompt: "${prompt}" (attempt ${retryCount + 1})`)
  try {
    const token = getHuggingFaceToken()
    console.log('Making request to HuggingFace API...')
    
    const response = await fetchWithTimeout(
      'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          options: {
            wait_for_model: true
          }
        }),
      },
      25000 // 25秒超时，给其他操作留出时间
    )

    if (!response.ok) {
      let errorText = await response.text()
      console.error(`API error response (${response.status}):`, errorText)
      
      // 检查是否返回了 HTML
      if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
        console.error('Received HTML response instead of JSON')
        if (response.status === 401 || response.status === 403) {
          throw new Error('API authentication failed. Please check your API token.')
        }
        throw new Error(`API returned HTML (status ${response.status}). The service might be experiencing issues.`)
      }

      try {
        const errorData = JSON.parse(errorText)
        
        // 处理不同类型的错误
        if (response.status === 503 && errorText.includes('loading') && retryCount < 2) {
          // 模型加载中，最多重试2次
          const retryWaitTime = Math.min(errorData.estimated_time || 10, 10) * 1000
          console.log(`Model loading, waiting ${retryWaitTime/1000}s before retry ${retryCount + 1}/2`)
          return generateImage(prompt, retryCount + 1, retryWaitTime)
        } else if (response.status === 429) {
          if (errorText.includes('Max requests total reached')) {
            // 如果是总请求数限制，等待更长时间
            if (retryCount < 3) {
              const retryWaitTime = 65000 // 等待65秒，确保超过1分钟的限制
              console.log(`Rate limited (total), waiting ${retryWaitTime/1000}s before retry ${retryCount + 1}/3`)
              return generateImage(prompt, retryCount + 1, retryWaitTime)
            }
          } else if (retryCount < 2) {
            // 其他速率限制，等待较短时间
            const retryWaitTime = 10000 // 等待10秒
            console.log(`Rate limited, waiting ${retryWaitTime/1000}s before retry ${retryCount + 1}/2`)
            return generateImage(prompt, retryCount + 1, retryWaitTime)
          }
        }
      } catch (parseError) {
        console.error('Error parsing API error response:', parseError)
        // 如果无法解析 JSON，返回原始错误文本
        throw new Error(`API Error (${response.status}): Unable to parse error response`)
      }

      throw new Error(`API Error (${response.status}): ${errorText}`)
    }

    // 验证响应是否为有效的图像数据
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('image/')) {
      console.error('Invalid content type received:', contentType)
      throw new Error('API returned invalid content type. Expected image data.')
    }

    console.log('Successfully received image data')
    return response.arrayBuffer()
  } catch (error) {
    if (error instanceof Error) {
      console.error('Generate image error:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })

      if (error.name === 'AbortError') {
        console.error('Request timeout')
        throw new Error('Request timeout')
      }
      if (retryCount < 1) {
        // 处理网络错误，最多重试1次
        const retryWaitTime = 5000 // 固定等待5秒
        console.log(`Network error, waiting ${retryWaitTime/1000}s before retry ${retryCount + 1}/1`)
        return generateImage(prompt, retryCount + 1, retryWaitTime)
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
    console.log('Checking request content type...')
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      console.error('Invalid content type:', contentType)
      return Response.json(
        { error: 'Content-Type must be application/json' },
        { status: 415 }
      )
    }

    console.log('Parsing request body...')
    const { text } = await request.json()

    if (!text) {
      console.error('Missing text in request')
      return Response.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    console.log('Starting image generation with text:', text)

    // 减少生成的帧数以避免超时
    const numFrames = 3 // 从4帧减少到3帧
    const frames = []

    for (let i = 0; i < numFrames; i++) {
      const framePrompt = `${text}, frame ${i + 1} of a sequence`
      console.log(`Generating frame ${i + 1}/${numFrames}`)

      try {
        // 为每个后续帧添加延迟，以避免速率限制
        if (i > 0) {
          console.log('Adding delay between frames to avoid rate limits...')
          await delay(5000) // 每帧之间等待5秒
        }

        const imageBuffer = await generateImage(framePrompt)
        console.log(`Successfully generated frame ${i + 1}`)
        
        // 将 ArrayBuffer 转换为 base64
        const uint8Array = new Uint8Array(imageBuffer)
        let binary = ''
        for (let j = 0; j < uint8Array.length; j++) {
          binary += String.fromCharCode(uint8Array[j])
        }
        const base64 = Buffer.from(binary, 'binary').toString('base64')
        console.log(`Successfully encoded frame ${i + 1} to base64`)
        
        frames.push(base64)
      } catch (error) {
        console.error(`Error generating frame ${i + 1}:`, error)
        throw error
      }
    }

    console.log('All frames generated successfully')

    return Response.json({ 
      output: frames,
      type: 'image-sequence'
    })
  } catch (error) {
    console.error('Error in generation:', error)
    
    // 根据错误类型返回适当的错误信息
    let errorMessage = 'Failed to generate content'
    let statusCode = 500
    let errorDetails = ''

    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })

      if (error.message.includes('API configuration error')) {
        statusCode = 503
        errorMessage = 'Service temporarily unavailable'
      } else if (error.message.includes('timeout')) {
        statusCode = 504
        errorMessage = 'Request timeout'
      } else if (error.message.includes('Rate limited') || error.message.includes('Max requests')) {
        statusCode = 429
        errorMessage = 'Service is busy. Please wait a moment and try again.'
      } else if (error.message.includes('API Error')) {
        errorMessage = 'Service is temporarily busy. Please try again in a minute.'
        statusCode = 429
      }

      errorDetails = process.env.NODE_ENV === 'development' ? error.stack || '' : ''
    }

    console.error(`Returning error response: ${statusCode} - ${errorMessage}`)
    return Response.json(
      { 
        error: errorMessage,
        details: errorDetails
      },
      { status: statusCode }
    )
  }
}
