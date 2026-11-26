// Reading multipart uploads in the admin's routes. Every admin route passes through proxy.ts,
// and Next buffers a request body that crosses proxy only up to experimental.proxyClientMaxBodySize
// (next.config.ts): past it the body arrives cut short and request.formData() fails with
// "Failed to parse body as FormData". The limit is raised for the admin's uploads, and this reader
// turns any failure into a clear message instead of that one.

/** Keep equal to experimental.proxyClientMaxBodySize in next.config.ts. */
export const UPLOAD_LIMIT_MB = 300;

export class UploadError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

/** The request's form data, or an UploadError that says what went wrong in plain words. */
export async function readForm(request: Request, { maxMb = UPLOAD_LIMIT_MB }: { maxMb?: number } = {}): Promise<FormData> {
  const type = request.headers.get("content-type") ?? "";
  if (!/multipart\/form-data|application\/x-www-form-urlencoded/i.test(type)) {
    throw new UploadError("O envio não veio como formulário. Recarregue a página e tente de novo.");
  }
  if (/multipart\/form-data/i.test(type) && !/boundary=/i.test(type)) {
    throw new UploadError("O envio veio sem a separação dos arquivos. Recarregue a página e tente de novo.");
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  const limit = Math.min(maxMb, UPLOAD_LIMIT_MB) * 1024 * 1024;
  if (length > limit) throw new UploadError(`O envio tem ${mb(length)} e o limite é ${mb(limit)}. Envie menos arquivos de cada vez.`, 413);
  try {
    return await request.formData();
  } catch {
    throw new UploadError(`O envio chegou incompleto. Tente de novo; se forem arquivos grandes, mande menos de cada vez (até ${mb(limit)} por envio).`);
  }
}
