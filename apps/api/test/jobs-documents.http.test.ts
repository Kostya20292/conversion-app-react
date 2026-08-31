import { type INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resultStorageKey, uploadStorageKey } from '@/file-store/storage-key';
import { StorageService } from '@/file-store/storage.service';
import { JobWorkerService } from '@/worker/job-worker.service';
import { createHttpApp } from './create-http-app';

const DOCX_BYTES = Buffer.from(
  'UEsDBBQAAAAIAGOaHl3XeYTq8QAAALgBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2QzU7DMBCE730Ky9cqccoBIZSkB36OwKE8wMreJFb9J69b2rdn00KREOVozXwz62nXB+/EHjPZGDq5qhspMOhobBg7+b55ru6koALBgIsBO3lEkut+0W6OCUkwHKiTUynpXinSE3qgOiYMrAwxeyj8zKNKoLcworppmlulYygYSlXmDNkvhGgfcYCdK+LpwMr5loyOpHg4e+e6TkJKzmoorKt9ML+Kqq+SmsmThyabaMkGqa6VzOL1jh/0lSfK1qB4g1xewLNRfcRslIl65xmu/0/649o4DFbjhZ/TUo4aiXh77+qL4sGG71+06jR8/wlQSwMEFAAAAAgAY5oeXSAbhuqyAAAALgEAAAsAAABfcmVscy8ucmVsc43Puw6CMBQG4J2naM4uBQdjDIXFmLAafICmPZRGeklbL7y9HRzEODie23fyN93TzOSOIWpnGdRlBQStcFJbxeAynDZ7IDFxK/nsLDJYMELXFs0ZZ57yTZy0jyQjNjKYUvIHSqOY0PBYOo82T0YXDE+5DIp6Lq5cId1W1Y6GTwPagpAVS3rJIPSyBjIsHv/h3ThqgUcnbgZt+vHlayPLPChMDB4uSCrf7TKzQHNKuorZvgBQSwMEFAAAAAgAY5oeXYiFzWylAAAA3wAAABEAAAB3b3JkL2RvY3VtZW50LnhtbDWOwQ7CIBBE734F2bulejCmKfRg4hfoByBg2wR2CaC1fy806eVlJpuZnX74ece+NqaZUMCpaYFZ1GRmHAU8H/fjFVjKCo1yhFbAahMM8tAvnSH98RYzKw2YukXAlHPoOE96sl6lhoLFcntT9CoXG0e+UDQhkrYplQfe8XPbXrhXM4I8MFZaX2TWKjcTZEGsyPJGWGZmt/a82sq4MWxJvker2qfJP1BLAQIUAxQAAAAIAGOaHl3XeYTq8QAAALgBAAATAAAAAAAAAAAAAACAAQAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQDFAAAAAgAY5oeXSAbhuqyAAAALgEAAAsAAAAAAAAAAAAAAIABIgEAAF9yZWxzLy5yZWxzUEsBAhQDFAAAAAgAY5oeXYiFzWylAAAA3wAAABEAAAAAAAAAAAAAAIAB/QEAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAADAAMAuQAAANECAAAAAA==',
  'base64',
);

const PDF_BYTES = Buffer.from(
  `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 51 >>
stream
BT /F1 12 Tf 72 720 Td (Convertly) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF
`,
);

type JobCreatedBody = { id: string; status: string };
type JobStatusBody = {
  id: string;
  status: string;
  source_format?: string;
  target_format?: string;
  download_url?: string;
  expires_at?: string;
  saved_to_profile?: boolean;
};

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const JOB_TIMEOUT_MS = 90_000;

const absoluteUrl = (baseUrl: string, maybeRelative: string): string => {
  if (maybeRelative.startsWith('http://') || maybeRelative.startsWith('https://')) {
    return maybeRelative;
  }

  return `${baseUrl}${maybeRelative}`;
};

const jobForm = (file: File, targetFormat: string): FormData => {
  const form = new FormData();
  form.append('file', file);
  form.append('target_format', targetFormat);
  return form;
};

const docxFile = (): File =>
  new File([new Uint8Array(DOCX_BYTES)], 'document.docx', { type: DOCX_MIME });

const pdfFile = (): File =>
  new File([new Uint8Array(PDF_BYTES)], 'document.pdf', { type: 'application/pdf' });

describe('jobs documents HTTP (план §8.1 / §15, ТЗ §2.1 / §7.2)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let storage: StorageService;
  let worker: JobWorkerService;

  beforeAll(async () => {
    app = await createHttpApp();
    baseUrl = await app.getUrl();
    storage = app.get(StorageService);
    worker = app.get(JobWorkerService);
  });

  afterAll(async () => {
    await app.close();
  });

  const postUiJob = async (form: FormData): Promise<Response> =>
    fetch(`${baseUrl}/api/jobs`, { method: 'POST', body: form });

  const getUiJob = async (id: string): Promise<Response> => fetch(`${baseUrl}/api/jobs/${id}`);

  const detectExt = async (bytes: Uint8Array): Promise<string | undefined> => {
    const { fileTypeFromBuffer } = await import('file-type');
    return (await fileTypeFromBuffer(bytes))?.ext;
  };

  const convertGuestJob = async (
    form: FormData,
  ): Promise<{
    id: string;
    polled: JobStatusBody;
    download: Response;
    downloaded: Buffer;
  }> => {
    const created = await postUiJob(form);
    const createdBody = (await created.json()) as JobCreatedBody;

    expect(created.status).toBe(202);
    expect(createdBody.status).toBe('queued');

    await worker.processJobById(createdBody.id);
    const polledResponse = await getUiJob(createdBody.id);
    const polled = (await polledResponse.json()) as JobStatusBody;
    const download = await fetch(absoluteUrl(baseUrl, polled.download_url ?? ''));
    const downloaded = Buffer.from(await download.arrayBuffer());

    expect(polledResponse.status).toBe(200);

    return { id: createdBody.id, polled, download, downloaded };
  };

  it(
    'lets a guest convert DOCX to PDF, poll completed, and download a PDF via the signed URL',
    { timeout: JOB_TIMEOUT_MS },
    async () => {
      const { id, polled, download, downloaded } = await convertGuestJob(
        jobForm(docxFile(), 'pdf'),
      );

      expect(polled.status).toBe('completed');
      expect(polled.source_format).toBe('docx');
      expect(polled.target_format).toBe('pdf');
      expect(polled.saved_to_profile).toBe(false);
      expect(polled.download_url).toMatch(new RegExp(`^/api/jobs/${id}/download\\?token=`));
      expect(download.status).toBe(200);
      expect(download.headers.get('content-type')).toMatch(/application\/pdf/);
      expect(await detectExt(downloaded)).toBe('pdf');
      await expect(storage.read(uploadStorageKey(id))).rejects.toThrow();
      expect(await storage.read(resultStorageKey(id))).toEqual(downloaded);
    },
  );

  it(
    'lets a guest convert PDF to DOCX, poll completed, and download a DOCX via the signed URL',
    { timeout: JOB_TIMEOUT_MS },
    async () => {
      const { id, polled, download, downloaded } = await convertGuestJob(
        jobForm(pdfFile(), 'docx'),
      );

      expect(polled.status).toBe('completed');
      expect(polled.source_format).toBe('pdf');
      expect(polled.target_format).toBe('docx');
      expect(polled.saved_to_profile).toBe(false);
      expect(polled.download_url).toMatch(new RegExp(`^/api/jobs/${id}/download\\?token=`));
      expect(download.status).toBe(200);
      expect(download.headers.get('content-type')).toMatch(
        /application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/,
      );
      expect(await detectExt(downloaded)).toBe('docx');
      await expect(storage.read(uploadStorageKey(id))).rejects.toThrow();
      expect(await storage.read(resultStorageKey(id))).toEqual(downloaded);
    },
  );
});
