# Text to Video Converter

A modern web application that converts text descriptions into engaging videos using AI technology.

## Features

- Text to video conversion using Replicate's Zeroscope V2 XL model
- Responsive design that works on desktop and mobile
- Server-side rendering for optimal performance and SEO
- Modern UI with Tailwind CSS
- TypeScript for type safety
- Loading states and error handling
- Video preview and download functionality

## Prerequisites

- Node.js 18.x or later
- Replicate API token

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your Replicate API token:
   ```
   REPLICATE_API_TOKEN=your_token_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Technology Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Replicate API
- Axios

## Project Structure

```
text-to-video/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── convert/
│   │   │       └── route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   └── components/
│       └── VideoForm.tsx
├── public/
├── package.json
└── README.md
```

## Development

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
