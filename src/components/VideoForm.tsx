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
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await fetch(`${baseUrl}/api/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate content')
      }

      const data = await response.json()
      console.log('API response received:', data)

      if (data.error) {
        throw new Error(data.error)
      }

      if (!Array.isArray(data.output)) {
        throw new Error('Invalid response format')
      }

      setFrames(data.output)
    } catch (err) {
      console.error('Error:', err)
      setError({
        error: err instanceof Error ? err.message : 'An unknown error occurred',
        details: err instanceof Error ? err.stack : undefined
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (frames.length > 0 && !loading) {
      timer = setInterval(() => {
        setCurrentFrame((prev) => (prev + 1) % frames.length)
      }, 200) // 每200毫秒切换一帧
    }
    return () => {
      if (timer) {
        clearInterval(timer)
      }
    }
  }, [frames, loading])

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700">
            Enter your text prompt
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            rows={4}
            placeholder="A cat playing piano..."
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            loading
              ? 'bg-indigo-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {loading ? 'Generating...' : 'Generate Animation'}
        </button>
      </form>

      {loading && (
        <div className="mt-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">{loadingMessage}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <p className="mt-2 text-sm text-red-700">{error.error}</p>
          {error.details && (
            <pre className="mt-2 text-xs text-red-600 overflow-auto">
              {error.details}
            </pre>
          )}
        </div>
      )}

      {frames.length > 0 && (
        <div className="mt-4">
          <div className="aspect-w-1 aspect-h-1 w-full">
            <img
              src={`data:image/png;base64,${frames[currentFrame]}`}
              alt={`Frame ${currentFrame + 1}`}
              className="object-contain w-full h-full rounded-lg shadow-lg"
            />
          </div>
          <p className="mt-2 text-sm text-gray-600 text-center">
            Frame {currentFrame + 1} of {frames.length}
          </p>
        </div>
      )}
    </div>
  )
}
