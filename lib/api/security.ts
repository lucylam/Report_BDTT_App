const isSameSiteFetch = (secFetchSite: string | null): boolean => {
  if (!secFetchSite) return true;
  return secFetchSite === "same-origin" || secFetchSite === "none";
};

const matchesRequestHost = (origin: string, host: string | null): boolean => {
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
};

/**
 * Chặn request cross-site (CSRF) tới các API route ghi dữ liệu.
 * Lưu ý: đây chỉ là lớp chống CSRF từ trình duyệt — chưa thay thế
 * được xác thực server-side thực sự (xem docs/audit-20260612.md).
 */
export const isAllowedRequestOrigin = (request: Request): boolean => {
  if (!isSameSiteFetch(request.headers.get("sec-fetch-site"))) return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return matchesRequestHost(origin, request.headers.get("host"));
};

export const forbiddenOriginMessage =
  "Yêu cầu bị từ chối: nguồn gửi (origin) không hợp lệ.";
