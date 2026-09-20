require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { writeDocument } = require("../src/cloudStore");

const API = "https://mocha-wear-production-4dd5.up.railway.app";
const FILE = path.join(__dirname, "..", "data", "reviews.json");

const reviews = [
  {
    name: "ayesha",
    city: "karachi",
    quote:
      "sky floral le liya sale pe.. fabric bht soft hai eid pe yehi pehnungi inshaAllah price b theek thi",
    rating: 5,
    product_id: "c68c681a-e42c-41bd-bf04-fa8d746bedcc",
    is_published: true,
    sort_order: 1,
  },
  {
    name: "Hira Malik",
    city: "Lahore",
    quote:
      "2 piece ready tha pehnne k lye mint colour pic jaisa hi hai packing achi thi wrinkle nai aya alhamdulillah",
    rating: 5,
    product_id: "c63f77cb-4fc9-41c8-b4e3-da141372ff3f",
    is_published: true,
    sort_order: 2,
  },
  {
    name: "fatima noor",
    city: "islamabad",
    quote:
      "size M perfect baith gya meri fitting pe delivery 4 din m aa gyi next b yahi se lunga honestly worth it",
    rating: 5,
    product_id: "c63f77cb-4fc9-41c8-b4e3-da141372ff3f",
    is_published: true,
    sort_order: 3,
  },
  {
    name: "Sana",
    city: "Faisalabad",
    quote:
      "sale wala socha quality kam hogi but nai stitching clean hai wash k baad print fade nai hua 4 star islye qk parcel 1 din late aya",
    rating: 4,
    product_id: "7f59117a-14f2-4c82-8be1-6a1953855711",
    is_published: true,
    sort_order: 4,
  },
  {
    name: "Mehwish Ali",
    city: "multan",
    quote:
      "ammi k lye desert grace liya unhe bht pasnd aya garmi m halka hai paisa wasool hai",
    rating: 5,
    product_id: "ea7c213e-1178-42dd-a3aa-ec9435dbfc2e",
    is_published: true,
    sort_order: 5,
  },
  {
    name: "zara ahmed",
    city: "Peshawar",
    quote:
      "COD se order kiya koi tension nai suit SAME hai jaisa pic m tha reccomend krti hu mocha wear",
    rating: 5,
    product_id: "22acaf67-f236-49ef-868e-8155b55816b1",
    is_published: true,
    sort_order: 6,
  },
  {
    name: "Nimra",
    city: "rwp",
    quote:
      "rose mist ka pink pic se b better hai farshi shalwar flow krti hai log poch rahe hn kaha se liya",
    rating: 5,
    product_id: "fe485e5b-0c6f-485d-98f9-cd9647402d4e",
    is_published: true,
    sort_order: 7,
  },
  {
    name: "Laiba hassan",
    city: "Khi",
    quote:
      "rang e meher colour bohat zbrdst hai print clear hai thora heavy lga pehli nazar m but comfortable hai",
    rating: 4,
    product_id: "d68eddad-73c1-4982-8be7-2a4d8810390a",
    is_published: true,
    sort_order: 8,
  },
  {
    name: "mahnoor",
    city: "lahore",
    quote:
      "midnight muse BLACK pe print kamal ka hai office se dinner tk same suit pehna comfortable b classy b",
    rating: 5,
    product_id: "624237dd-3062-407a-951b-29db18476f1e",
    is_published: true,
    sort_order: 9,
  },
  {
    name: "Iqra",
    city: "hyderabad",
    quote:
      "noir gul ka black n white print acha lga tassel neckline pyari hai quality sale se better lgti hai tbh",
    rating: 5,
    product_id: "5236aa0f-243c-457e-9a2b-165d448a8398",
    is_published: true,
    sort_order: 10,
  },
  {
    name: "areeba javed",
    city: "Fsd",
    quote:
      "pehli dafa order kiya packing neat thi suit pics jesa hi aya ab meri go to sale yahi hai thnx mocha wear",
    rating: 5,
    product_id: "c68c681a-e42c-41bd-bf04-fa8d746bedcc",
    is_published: true,
    sort_order: 11,
  },
  {
    name: "Sadia R",
    city: "Isb",
    quote:
      "siyah noor black m so elegant dinner pe pehna log poch rhy thy kaha se liya fabric acha hai just wow",
    rating: 5,
    product_id: "7f59117a-14f2-4c82-8be1-6a1953855711",
    is_published: true,
    sort_order: 12,
  },
];

async function adminFetch(urlPath, token, options = {}) {
  const res = await fetch(`${API}${urlPath}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `${res.status} ${urlPath}`);
  return data;
}

(async () => {
  const login = await fetch(`${API}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  const auth = await login.json();
  if (!auth.token) throw new Error(auth.message || "Admin login failed");
  const token = auth.token;

  const existing = await adminFetch("/api/admin/reviews", token);
  for (const item of existing.items || []) {
    await adminFetch(`/api/admin/reviews/${item.id}`, token, { method: "DELETE" });
  }

  const created = [];
  for (const review of reviews) {
    const data = await adminFetch("/api/admin/reviews", token, {
      method: "POST",
      body: JSON.stringify(review),
    });
    created.push(data.item);
  }

  const payload = { reviews: created };
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(payload, null, 2));
  await writeDocument("reviews", payload);
  console.log("live reviews", created.length);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
