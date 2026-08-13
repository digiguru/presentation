export const defaultGptApiBase = '/api/prompt';

export function resolveGptApiBase(documentRoot) {
  const configured = documentRoot
    ?.querySelector?.('meta[name="pure-gpt-api-base"]')
    ?.getAttribute?.('content')
    ?.trim();

  if (!configured) return defaultGptApiBase;
  return configured.replace(/\/+$/, '');
}
