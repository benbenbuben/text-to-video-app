'use client'

import { useState, useEffect } from 'react'

interface ErrorResponse {
  error: string
  details?: string
}

export default function VideoForm() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ErrorResponse | null>(null)
  const [frames, setFrames] = useState<string[]>([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('Generating frames...')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setFrames([])
    setCurrentFrame(0)
    setLoadingMessage('Generating frames...')

    try {
      console.log('Submitting text:', text)
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })

      const data = await response.json()
      console.log('API response received')

      if (!response.ok) {
        // 检查是否是速率限制错误
        if (data.error?.includes('Max requests')) {
          setLoadingMessage('Rate limited. Please wait a minute before trying again.')
          throw new Error(data.error)
        }
        // 检查是否是模型加载错误
        if (data.error?.includes('Model') && data.error?.includes('loading')) {
          const match = data.error.match(/estimated_time":(\d+\.?\d*)/)
          const estimatedTime = match ? parseFloat(match[1]) : 20
          const waitTime = Math.min(estimatedTime, 20)
          setLoadingMessage(`Model is warming up, please wait ~${Math.ceil(waitTime)} seconds...`)
          throw new Error(data.error)
        }
        throw new Error(data.error || 'Failed to generate content')
      }

      if (!data.output || !Array.isArray(data.output)) {
        throw new Error('Invalid response format')
      }

      setFrames(data.output)
    } catch (err) {
      console.error('Error in generation:', err)
      setError({
        error: err instanceof Error ? err.message : 'Something went wrong',
        details: err instanceof Error ? err.stack : undefined
      })
    } finally {
      setLoading(false)
      setLoadingMessage('Generating frames...')
    }
  }

  useEffect(() => {
    if (frames.length > 0) {
      const interval = setInterval(() => {
        setCurrentFrame((prev) => (prev + 1) % frames.length)
      }, 200) // 每200ms切换一帧

      return () => clearInterval(interval)
    }
  }, [frames])

  return (
    <div className="max-w-2xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="text"
            className="block text-sm font-medium text-gray-700"
          >
            Enter your text
          </label>
          <textarea
            id="text"
            name="text"
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            placeholder="Describe the animation you want to create..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {loading ? (
            <span className="loading-dots">{loadingMessage}</span>
          ) : (
            'Generate Animation'
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 rounded-md bg-red-50 text-red-700">
          <p className="font-medium">Error: {error.error}</p>
          {error.details && (
            <pre className="mt-2 text-sm overflow-auto">
              {error.details}
            </pre>
          )}
        </div>
      )}

      {frames.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-medium text-gray-900">Generated Animation</h2>
          <div className="mt-2 aspect-square rounded-lg overflow-hidden bg-gray-100">
            <img
              src={`data:image/jpeg;base64,${frames[currentFrame]}`}
              alt={`Frame ${currentFrame + 1}`}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="mt-2 text-sm text-gray-500 text-center">
            Frame {currentFrame + 1} of {frames.length}
          </div>
        </div>
      )}
    </div>
  )
}
