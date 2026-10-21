import test from 'node:test';
import assert from 'node:assert/strict';
import { presign } from './storage.js';

// The worked example from the AWS S3 SigV4 docs ("Authenticating Requests: Using Query Parameters").
test('presign matches the AWS documented example', () => {
  const url = presign({
    method: 'GET', host: 'examplebucket.s3.amazonaws.com', path: '/test.txt', region: 'us-east-1',
    accessKey: 'AKIAIOSFODNN7EXAMPLE', secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    expires: 86400, date: new Date('2013-05-24T00:00:00Z'),
  });
  assert.match(url, /X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404$/);
});
