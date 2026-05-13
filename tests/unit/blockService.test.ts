/* eslint-env jest */
import { blockService } from '../../services/blockService';
import { COLLECTIONS } from '../../config/database';
import { seedDoc } from '../support/mockFirestore';

describe('blockService', () => {
  it('addBlock rejects self-block', async () => {
    await expect(blockService.addBlock('a', 'a')).rejects.toThrow('INVALID');
  });

  it('addBlock returns existing id when duplicate', async () => {
    seedDoc(COLLECTIONS.BLOCKS, 'b1', {
      id: 'b1',
      blockerId: 'u1',
      blockedId: 'u2',
      createdAt: new Date(),
    });
    const id = await blockService.addBlock('u1', 'u2');
    expect(id).toBe('b1');
  });

  it('addBlock creates a new block', async () => {
    const id = await blockService.addBlock('u3', 'u4');
    expect(id).toBeDefined();
  });

  it('removeBlock returns false when nothing exists', async () => {
    const removed = await blockService.removeBlock('xxx', 'yyy');
    expect(removed).toBe(false);
  });

  it('removeBlock deletes existing blocks', async () => {
    seedDoc(COLLECTIONS.BLOCKS, 'rm-1', {
      id: 'rm-1',
      blockerId: 'u5',
      blockedId: 'u6',
      createdAt: new Date(),
    });
    const removed = await blockService.removeBlock('u5', 'u6');
    expect(removed).toBe(true);

    const stillBlocked = await blockService.isBlockedBetween('u5', 'u6');
    expect(stillBlocked).toBe(false);
  });

  it('isBlockedBetween checks both directions', async () => {
    seedDoc(COLLECTIONS.BLOCKS, 'ab', {
      id: 'ab',
      blockerId: 'A',
      blockedId: 'B',
      createdAt: new Date(),
    });

    expect(await blockService.isBlockedBetween('A', 'B')).toBe(true);
    expect(await blockService.isBlockedBetween('B', 'A')).toBe(true);
    expect(await blockService.isBlockedBetween('C', 'D')).toBe(false);
  });
});
