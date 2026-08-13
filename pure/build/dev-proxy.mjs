export const promptProxy = {
  '/api/prompt': {
    target: 'https://ai-prompt-writer.vercel.app',
    changeOrigin: true,
    rewrite: requestPath => requestPath.replace(/^\/api\/prompt/, '/api'),
  },
};
