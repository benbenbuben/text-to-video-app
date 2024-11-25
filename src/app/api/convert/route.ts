import { NextResponse } from 'next/server'

if (!process.env.HUGGINGFACE_API_TOKEN) {
  throw new Error('Missing HuggingFace API token')
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generateImage(prompt: string, retryCount = 0): Promise<ArrayBuffer> {
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      const errorData = JSON.parse(errorText)
      
      // 处理不同类型的错误
      if (response.status === 503 && errorData.error?.includes('loading') && retryCount < 3) {
        // 模型加载中
        const waitTime = Math.min(errorData.estimated_time || 20, 20) * 1000
        console.log(`Model loading, waiting ${waitTime/1000}s before retry ${retryCount + 1}/3`)
        await sleep(waitTime)
        return generateImage(prompt, retryCount + 1)
      } else if (response.status === 429 && retryCount < 5) {
        // 速率限制
        const waitTime = 65000 // 等待65秒，略多于1分钟的限制
        console.log(`Rate limited, waiting ${waitTime/1000}s before retry ${retryCount + 1}/5`)
        await sleep(waitTime)
        return generateImage(prompt, retryCount + 1)
      }

      throw new Error(`API Error (${response.status}): ${errorText}`)
    }

    return response.arrayBuffer()
  } catch (error) {
    if (error instanceof Error && retryCount < 3) {
      // 处理网络错误
      const waitTime = 5000 * (retryCount + 1) // 递增等待时间
      console.log(`Network error, waiting ${waitTime/1000}s before retry ${retryCount + 1}/3`)
      console.error(error)
      await sleep(waitTime)
      return generateImage(prompt, retryCount + 1)
    }
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    console.log('Starting image generation with text:', text)

    // 生成图片序列
    const numFrames = 8
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
        
        // 在帧之间添加更长的延迟以避免速率限制
        if (i < numFrames - 1) {
          await sleep(3000) // 等待3秒再生成下一帧
        }
      } catch (error) {
        console.error(`Error generating frame ${i + 1}:`, error)
        throw error
      }
    }

    console.log('All frames generated')

    return NextResponse.json({ 
      output: frames,
      type: 'image-sequence'
    })
  } catch (error) {
    console.error('Error in generation:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate content',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
