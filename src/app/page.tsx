// 确保这是服务器组件
'use server'

import VideoForm from '@/components/VideoForm'

export default function Home() {
  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Transform Your Text</span>
            <span className="block text-primary-600">Into Stunning Videos</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Enter your text below and watch as AI transforms it into a beautiful video. Perfect for content creators, marketers, and storytellers.
          </p>
        </div>

        <div className="mt-10">
          <VideoForm />
        </div>

        <div className="mt-20">
          <h2 className="text-2xl font-bold text-gray-900 text-center">
            How It Works
          </h2>
          <div className="mt-10 max-w-4xl mx-auto">
            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    1
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">
                    Enter Your Text
                  </p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Type in your text or description of the video you want to create.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    2
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">
                    AI Processing
                  </p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Our AI model processes your text and generates a unique video.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    3
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">
                    Download Video
                  </p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Preview and download your generated video in high quality.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
