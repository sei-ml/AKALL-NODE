/**
 * test/nd3Service.test.js
 *
 * A basic placeholder test for nd3ProcessingService or similar.
 */

const { processNd3File } = require('../src/services/nd3ProcessingService');

jest.mock('../src/utils/tarUtils', () => ({
  decompressTarGz: jest.fn().mockResolvedValue(true),
}));

describe('nd3ProcessingService', () => {
  test('processNd3File should run without throwing', async () => {
    await expect(processNd3File('fake-file.tar.gz')).resolves.not.toThrow();
  });
});
