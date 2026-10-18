export interface Attempt {
  url: string;
  proxied: boolean;
  retry: boolean;
}
export function playbackAttempts(
  urls: string[],
  secure: boolean,
  proxy: string,
): Attempt[] {
  return urls.flatMap((url) => {
    const direct =
      secure && url.startsWith("http:")
        ? []
        : [
            { url, proxied: false, retry: false },
            { url, proxied: false, retry: true },
          ];
    return proxy
      ? [
          ...direct,
          {
            url: `${proxy}?url=${encodeURIComponent(url)}`,
            proxied: true,
            retry: false,
          },
        ]
      : direct;
  });
}
