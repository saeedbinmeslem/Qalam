import { describe, expect, it } from 'vitest';
import { AdminPolicy } from '@qalam/domain';
import { ForbiddenError, UnauthenticatedError } from '../../errors.js';
import type { MediaUploadSignerPort } from '../../ports/media-upload.port.js';
import { CreateUploadTicketUseCase } from './admin-media.usecases.js';

const ticket = { uploadUrl: 'https://x', apiKey: 'k', timestamp: 1, folder: 'f', signature: 's' };
const uploads: MediaUploadSignerPort = { sign: () => ticket };
const policy = AdminPolicy.fromList('owner@qalam.dev');

describe('CreateUploadTicket', () => {
  it('يمنح المدير تذكرة الرفع فقط', () => {
    const useCase = new CreateUploadTicketUseCase({ policy, uploads });
    expect(useCase.execute({ actor: { id: 'u1', email: 'owner@qalam.dev' } })).toEqual(ticket);
    expect(() => useCase.execute({ actor: null })).toThrow(UnauthenticatedError);
    expect(() => useCase.execute({ actor: { id: 'u2', email: 'x@y.com' } })).toThrow(ForbiddenError);
  });

  it('يعيد null عندما لا يكون الرفع مفعّلًا', () => {
    const useCase = new CreateUploadTicketUseCase({ policy, uploads: { sign: () => null } });
    expect(useCase.execute({ actor: { id: 'u1', email: 'owner@qalam.dev' } })).toBeNull();
  });
});
