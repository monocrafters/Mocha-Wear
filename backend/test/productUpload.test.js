const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
const cloudinary = require('../src/cloudinary');
const sdk = require('cloudinary').v2;
let document = { products: [] };
require.cache[require.resolve('../src/cloudStore')] = { exports: {
  createDocumentStore: () => ({ read: async () => structuredClone(document), write: async value => { document = structuredClone(value); } }),
} };
const products = require('../src/products');
test('signed browser uploads are fixed to product folders, unique, and do not disclose the secret', () => {
  for (const type of ['image', 'video']) {
    const signed = cloudinary.signProductUpload(type);
    assert.equal(signed.upload_url, 'https://api.cloudinary.com/v1_1/test-cloud/' + type + '/upload');
    assert.equal(signed.signature, sdk.utils.api_sign_request(signed.params, 'test-secret'));
    assert.equal(signed.params.overwrite, false);
    assert.ok(signed.params.folder.startsWith('mocha-wear/products'));
    assert.notEqual(signed.params.public_id, cloudinary.signProductUpload(type).params.public_id);
    assert.ok(!JSON.stringify(signed).includes('test-secret'));
    assert.ok(!('transformation' in signed.params));
  }
  assert.throws(() => cloudinary.signProductUpload('raw'), { status: 400 });
});
test('JSON product saves retain direct-upload image order, IDs, video and allow removing all images', async () => {
  const created = await products.createOne({ name: 'Upload regression', image_order: [{url:'https://example.com/a.png'}, {url:'https://example.com/b.png'}], video_url:'https://example.com/video.mp4' });
  assert.deepEqual(created.images.map(i => i.url), ['https://example.com/a.png', 'https://example.com/b.png']);
  const updated = await products.updateOne(created.id, {image_order:[created.images[1],{url:'https://example.com/c.png'}], existing_images:[]});
  assert.equal(updated.images[0].id,created.images[1].id);
  assert.equal(updated.video_url,created.video_url);
  const cleared = await products.updateOne(created.id,{ image_order:[], existing_images:[],clear_video:true });
  assert.deepEqual(cleared.images,[]);
  assert.equal(cleared.video_url,'');
});
