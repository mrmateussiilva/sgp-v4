/**
 * Testes para normalização de paths de imagens
 */
import { describe, it, expect } from 'vitest';
import { normalizeImagePath, isValidImagePath } from '@/utils/path';

describe('normalizeImagePath', () => {
  it('deve retornar string vazia para path inválido', () => {
    expect(normalizeImagePath('')).toBe('');
    expect(normalizeImagePath(null as any)).toBe('');
    expect(normalizeImagePath(undefined as any)).toBe('');
  });

  it('deve preservar base64 images', () => {
    const base64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    expect(normalizeImagePath(base64)).toBe(base64);
  });

  it('deve preservar URLs HTTP/HTTPS', () => {
    const httpUrl = 'http://example.com/image.png';
    const httpsUrl = 'https://example.com/image.png';
    expect(normalizeImagePath(httpUrl)).toBe(httpUrl);
    expect(normalizeImagePath(httpsUrl)).toBe(httpsUrl);
  });

  it('deve normalizar separadores Windows para Unix', () => {
    const windowsPath = 'C:\\Users\\user\\img.png';
    const normalized = normalizeImagePath(windowsPath);
    expect(normalized).toBe('C:/Users/user/img.png');
    expect(normalized).not.toContain('\\');
  });

  it('deve normalizar paths Linux/Unix', () => {
    const unixPath = '/home/user/img.png';
    expect(normalizeImagePath(unixPath)).toBe('/home/user/img.png');
  });

  it('deve remover espaços extras', () => {
    const pathWithSpaces = '  /home/user/img.png  ';
    expect(normalizeImagePath(pathWithSpaces)).toBe('/home/user/img.png');
  });

  it('deve normalizar paths mistos', () => {
    const mixedPath = 'C:\\Users\\user\\Documents\\img.png';
    const normalized = normalizeImagePath(mixedPath);
    expect(normalized).toBe('C:/Users/user/Documents/img.png');
  });
});

describe('isValidImagePath', () => {
  it('deve retornar false para valores inválidos', () => {
    expect(isValidImagePath('')).toBe(false);
    expect(isValidImagePath(null as any)).toBe(false);
    expect(isValidImagePath(undefined as any)).toBe(false);
  });

  it('deve retornar true para base64 images', () => {
    const base64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    expect(isValidImagePath(base64)).toBe(true);
  });

  it('deve retornar true para URLs HTTP/HTTPS', () => {
    expect(isValidImagePath('http://example.com/image.png')).toBe(true);
    expect(isValidImagePath('https://example.com/image.png')).toBe(true);
  });

  it('deve retornar true para paths de arquivo válidos', () => {
    expect(isValidImagePath('/home/user/img.png')).toBe(true);
    expect(isValidImagePath('C:\\Users\\user\\img.png')).toBe(true);
    expect(isValidImagePath('img.png')).toBe(true);
  });

  it('deve retornar false para strings vazias após trim', () => {
    expect(isValidImagePath('   ')).toBe(false);
  });
});

