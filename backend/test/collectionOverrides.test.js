const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
let document;
require.cache[require.resolve('../src/cloudStore')] = {exports:{createDocumentStore:()=>({read:async()=>structuredClone(document),write:async value=>{document=structuredClone(value)}})}};
const products = require('../src/products');
const pricing = require('../src/resellerPricing');
beforeEach(()=>{document={products:[]}});
const create = () => products.createOne({name:'Shared suit',price:3000,description:'Default',collection_ids:['cotrai','lawn'],collection_overrides:{cotrai:{price:2500,name:'Winter suit',description:'Warm',fabric:'Cotrai'},lawn:{price:2000,description:'Light'}}});
test('collection views persist separately and do not mutate the base product',async()=>{
 const item=await create();
 assert.equal((await products.listPublished({collection:'cotrai'}))[0].price,2500);
 assert.equal((await products.listPublished({collection:'lawn'}))[0].description,'Light');
 assert.equal((await products.getById(item.id)).price,3000);
 assert.equal(products.forCollection(item,'other').price,3000);
 assert.equal(products.forCollection(item,'cotrai').name,'Winter suit');
 const edited=await products.updateOne(item.id,{color:'Red'});
 assert.equal(edited.collection_overrides.cotrai.price,2500);
 const removed=await products.updateOne(item.id,{collection_ids:['lawn']});
 assert.equal(removed.collection_overrides.cotrai,undefined);
});
test('invalid prices fail atomically and blank overrides fall back to defaults',async()=>{
 const item=await create();
 for(const price of [-1,'invalid',Infinity]) await assert.rejects(products.updateOne(item.id,{collection_overrides:{cotrai:{price}}}),{status:400});
 assert.equal((await products.getById(item.id)).collection_overrides.cotrai.price,2500);
 const reset=await products.updateOne(item.id,{collection_overrides:{cotrai:{price:'',description:''}}});
 assert.equal(products.forCollection(reset,'cotrai').price,3000);
 assert.equal(products.forCollection(reset,'cotrai').description,'Default');
});
test('checkout resolves saved collection prices, ignoring submitted price tampering',async()=>{
 const item=await create();
 const req={headers:{},query:{}};
 const result=await pricing.resolveOrderItems([{product_id:item.id,collection_id:'cotrai',price:1,qty:2},{product_id:item.id,collection_id:'lawn',price:1,qty:1},{product_id:item.id,collection_id:'foreign',price:1,qty:1}],req);
 assert.deepEqual(result.items.map(row=>row.price),[2500,2000,3000]);
 assert.deepEqual(result.items.map(row=>row.collection_id),['cotrai','lawn','']);
 req.query.contexts=JSON.stringify({winter:{id:item.id,collection:'cotrai'},summer:{id:item.id,collection:'lawn'}});
 const refreshed=await pricing.pricingForIds([item.id],req);
 assert.deepEqual(refreshed.map(row=>[row.cart_key,row.price]),[['winter',2500],['summer',2000]]);
});
