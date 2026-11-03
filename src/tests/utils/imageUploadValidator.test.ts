import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateImageFile,
  MAX_IMAGE_FILE_SIZE_BYTES,
  handleImageUpload,
} from '@/utils/imageUploadValidator';
import * as isTauriModule from '@/utils/isTauri';
import * as localImageManager from '@/utils/localImageManager';

vi.mock('@/utils/localImageManager', () => ({
  processAndSaveImage: vi.fn(),
}));

vi.mock('@/utils/imagePreview', () => ({
  getImagePreviewUrl: vi.fn((path) => Promise.resolve(`blob:${path}`)),
}));

describe('imageUploadValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateImageFile', () => {
    it('deve aprovar imagem JPEG válida com tamanho dentro do limite', () => {
      const file = new File(['fake-image-content'], 'foto.jpg', {
        type: 'image/jpeg',
      });
      const result = validateImageFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('deve aprovar imagem PNG válida', () => {
      const file = new File(['fake-png-content'], 'arte.png', {
        type: 'image/png',
      });
      const result = validateImageFile(file);
      expect(result.valid).toBe(true);
    });

    it('deve rejeitar arquivo com tipo MIME inválido (ex: PDF ou executável)', () => {
      const file = new File(['document-content'], 'manual.pdf', {
        type: 'application/pdf',
      });
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Formato não suportado');
    });

    it('deve rejeitar imagem que exceda o limite de 10 MB', () => {
      const bigSize = MAX_IMAGE_FILE_SIZE_BYTES + 1024 * 1024; // 11 MB
      // Criar mock de File com tamanho artificial
      const bigFile = new File([''], 'banner_gigante.jpg', {
        type: 'image/jpeg',
      });
      Object.defineProperty(bigFile, 'size', { value: bigSize });

      const result = validateImageFile(bigFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('11.0 MB');
      expect(result.error).toContain('tamanho máximo permitido é de 10 MB');
    });
  });

  describe('handleImageUpload', () => {
    it('deve lançar erro se o arquivo for inválido', async () => {
      const invalidFile = new File([''], 'script.exe', { type: 'application/x-msdownload' });
      await expect(handleImageUpload(invalidFile)).rejects.toThrow('Formato não suportado');
    });

    it('no ambiente desktop (Tauri) deve processar e salvar imagem localmente', async () => {
      vi.spyOn(isTauriModule, 'isTauri').mockReturnValue(true);
      (localImageManager.processAndSaveImage as any).mockResolvedValue({
        local_path: '/caminho/local/imagem.jpg',
        file_name: 'imagem.jpg',
      });

      const file = new File(['dummy-bytes'], 'painel.png', { type: 'image/png' });
      // Mock arrayBuffer
      file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

      const result = await handleImageUpload(file);
      expect(result.localPathOrBase64).toBe('/caminho/local/imagem.jpg');
      expect(result.previewUrl).toBe('blob:/caminho/local/imagem.jpg');
      expect(localImageManager.processAndSaveImage).toHaveBeenCalledTimes(1);
    });
  });
});
