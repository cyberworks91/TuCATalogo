import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import AdmZip from 'adm-zip';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'ft');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-cat-key';

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const DB_FILES = {
  catalogs: path.join(DATA_DIR, 'catalogs.json'),
  users: path.join(DATA_DIR, 'users.json'),
  products: path.join(DATA_DIR, 'products.json'),
  orders: path.join(DATA_DIR, 'orders.json'),
  productTypes: path.join(DATA_DIR, 'productTypes.json'),
};

// Initialize DB files if they don't exist
Object.values(DB_FILES).forEach(file => {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify([]));
});

// Seed Super Admin and Product Types if no users exist
const seedData = async () => {
  const users = JSON.parse(fs.readFileSync(DB_FILES.users, 'utf8'));
  if (users.length === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    users.push({
      id: '1',
      email: 'admin@tucatalogo.com',
      username: 'admin',
      password: hashedPassword,
      role: 'superadmin',
      catalogId: null
    });
    fs.writeFileSync(DB_FILES.users, JSON.stringify(users, null, 2));
    console.log('Super Admin seeded: admin@tucatalogo.com / admin123');
  }

  const types = JSON.parse(fs.readFileSync(DB_FILES.productTypes, 'utf8'));
  if (types.length === 0) {
    const initialTypes = [
      { id: '1', name: 'Comida', emoji: '🍕' },
      { id: '2', name: 'Aseo', emoji: '🧼' },
      { id: '3', name: 'Juguetes', emoji: '🧸' },
      { id: '4', name: 'Ferretería', emoji: '🛠️' },
      { id: '5', name: 'Otros', emoji: '📦' },
    ];
    fs.writeFileSync(DB_FILES.productTypes, JSON.stringify(initialTypes, null, 2));
    console.log('Initial product types seeded');
  }
};
seedData();

// Helper to read/write DB
const readDB = (key: keyof typeof DB_FILES) => JSON.parse(fs.readFileSync(DB_FILES[key], 'utf8'));
const writeDB = (key: keyof typeof DB_FILES, data: any) => fs.writeFileSync(DB_FILES[key], JSON.stringify(data, null, 2));

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use('/ft', express.static(UPLOADS_DIR));

  // --- AUTH ROUTES ---
  app.post('/api/auth/register', async (req, res) => {
    const { email, username, password, role, catalogId, fullName, phone } = req.body;
    const users = readDB('users');
    if (users.find((u: any) => u.email === email || u.username === username)) {
      return res.status(400).json({ error: 'User or email already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { 
      id: Date.now().toString(), 
      email, 
      username: username || email.split('@')[0],
      fullName: fullName || '',
      phone: phone || '',
      password: hashedPassword, 
      role: role || 'user', 
      catalogId: catalogId || null,
      avatar: '👤'
    };
    users.push(newUser);
    writeDB('users', users);
    res.json({ message: 'User created' });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { identifier, password } = req.body; // identifier can be email or username
    const users = readDB('users');
    const user = users.find((u: any) => u.email === identifier || u.username === identifier);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role, catalogId: user.catalogId }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, username: user.username, role: user.role, catalogId: user.catalogId } });
  });

  // --- CATALOG ROUTES ---
  app.get('/api/catalogs', (req, res) => res.json(readDB('catalogs')));
  app.post('/api/catalogs', (req, res) => {
    const catalogs = readDB('catalogs');
    const newCatalog = { 
      id: Date.now().toString(), 
      ...req.body, 
      settings: req.body.settings || { bgColor: '#ffffff', textColor: '#000000', windowColor: '#f3f4f6', logo: null },
      exchangeRate: req.body.exchangeRate || 1
    };
    catalogs.push(newCatalog);
    writeDB('catalogs', catalogs);
    res.json(newCatalog);
  });

  app.put('/api/catalogs/:id', (req, res) => {
    const catalogs = readDB('catalogs');
    const idx = catalogs.findIndex((c: any) => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    catalogs[idx] = { ...catalogs[idx], ...req.body };
    writeDB('catalogs', catalogs);
    res.json(catalogs[idx]);
  });

  app.post('/api/catalogs/:id/logo', upload.single('logo'), (req, res) => {
    const catalogs = readDB('catalogs');
    const idx = catalogs.findIndex((c: any) => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    
    if (req.file) {
      catalogs[idx].settings.logo = req.file.filename;
      writeDB('catalogs', catalogs);
    }
    res.json(catalogs[idx]);
  });

  // --- PRODUCT TYPES ROUTES ---
  app.get('/api/product-types', (req, res) => res.json(readDB('productTypes')));
  app.post('/api/product-types', (req, res) => {
    const types = readDB('productTypes');
    const newType = { id: Date.now().toString(), ...req.body };
    types.push(newType);
    writeDB('productTypes', types);
    res.json(newType);
  });
  app.put('/api/product-types/:id', (req, res) => {
    const types = readDB('productTypes');
    const idx = types.findIndex((t: any) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    types[idx] = { ...types[idx], ...req.body };
    writeDB('productTypes', types);
    res.json(types[idx]);
  });
  app.delete('/api/product-types/:id', (req, res) => {
    const types = readDB('productTypes');
    const filtered = types.filter((t: any) => t.id !== req.params.id);
    writeDB('productTypes', filtered);
    res.json({ message: 'Deleted' });
  });

  // --- PRODUCT ROUTES ---
  app.get('/api/products', (req, res) => {
    const { catalogId } = req.query;
    let products = readDB('products');
    if (catalogId) products = products.filter((p: any) => p.catalogId === catalogId);
    res.json(products);
  });

  app.post('/api/products', upload.array('photos'), (req, res) => {
    const products = readDB('products');
    const photos = (req.files as Express.Multer.File[]).map(f => f.filename);
    const { existingPhotos, ...rest } = req.body;
    
    let parsedExisting: string[] = [];
    try {
      parsedExisting = JSON.parse(Array.isArray(existingPhotos) ? existingPhotos[0] : (existingPhotos || '[]'));
    } catch (e) {
      console.error('Error parsing existingPhotos:', e);
    }

    const newProduct = { 
      id: Date.now().toString(), 
      ...rest, 
      photos: [...parsedExisting, ...photos],
      createdAt: new Date().toISOString()
    };
    products.push(newProduct);
    writeDB('products', products);
    res.json(newProduct);
  });

  app.put('/api/products/:id', upload.array('photos'), (req, res) => {
    const products = readDB('products');
    const idx = products.findIndex((p: any) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    
    const photos = (req.files as Express.Multer.File[]).map(f => f.filename);
    const { existingPhotos, ...rest } = req.body;

    let parsedExisting: string[] = [];
    try {
      parsedExisting = JSON.parse(Array.isArray(existingPhotos) ? existingPhotos[0] : (existingPhotos || '[]'));
    } catch (e) {
      console.error('Error parsing existingPhotos:', e);
    }

    products[idx] = { 
      ...products[idx], 
      ...rest,
      photos: [...parsedExisting, ...photos]
    };
    writeDB('products', products);
    res.json(products[idx]);
  });

  app.delete('/api/products/:id', (req, res) => {
    const products = readDB('products');
    const filtered = products.filter((p: any) => p.id !== req.params.id);
    writeDB('products', filtered);
    res.json({ message: 'Deleted' });
  });

  app.get('/api/users', (req, res) => {
    const { catalogId } = req.query;
    let users = readDB('users');
    if (catalogId) users = users.filter((u: any) => u.catalogId === catalogId);
    res.json(users.map((u: any) => {
      const { password, ...rest } = u;
      return rest;
    }));
  });

  app.put('/api/users/:id', async (req, res) => {
    const users = readDB('users');
    const idx = users.findIndex((u: any) => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    
    const { password, ...rest } = req.body;
    if (password) {
      rest.password = await bcrypt.hash(password, 10);
    }
    users[idx] = { ...users[idx], ...rest };
    writeDB('users', users);
    res.json({ message: 'User updated' });
  });

  app.post('/api/users/:id/avatar', upload.single('avatar'), (req, res) => {
    const users = readDB('users');
    const idx = users.findIndex((u: any) => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    
    if (req.file) {
      users[idx].avatar = req.file.filename;
      writeDB('users', users);
      res.json(users[idx]);
    } else {
      res.status(400).json({ error: 'No file uploaded' });
    }
  });

  app.delete('/api/users/:id', (req, res) => {
    const users = readDB('users');
    const filtered = users.filter((u: any) => u.id !== req.params.id);
    writeDB('users', filtered);
    res.json({ message: 'User deleted' });
  });

  // --- ORDER ROUTES ---
  app.get('/api/orders', (req, res) => {
    const { catalogId, userId } = req.query;
    let orders = readDB('orders');
    if (catalogId) orders = orders.filter((o: any) => o.catalogId === catalogId);
    if (userId) orders = orders.filter((o: any) => o.userId === userId);
    res.json(orders);
  });

  app.post('/api/orders', (req, res) => {
    const orders = readDB('orders');
    const newOrder = { id: Date.now().toString(), ...req.body, status: 'pending', createdAt: new Date().toISOString() };
    orders.push(newOrder);
    writeDB('orders', orders);
    res.json(newOrder);
  });

  app.put('/api/orders/:id', (req, res) => {
    const orders = readDB('orders');
    const idx = orders.findIndex((o: any) => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    orders[idx] = { ...orders[idx], ...req.body };
    writeDB('orders', orders);
    res.json(orders[idx]);
  });

  // --- EXPORT/IMPORT ---
  app.get('/api/export/catalog/:id', (req, res) => {
    const catalogId = req.params.id;
    const products = readDB('products').filter((p: any) => p.catalogId === catalogId);
    const catalog = readDB('catalogs').find((c: any) => c.id === catalogId);
    
    const zip = new AdmZip();
    zip.addFile('data.json', Buffer.from(JSON.stringify({ catalog, products }, null, 2)));
    
    products.forEach((p: any) => {
      p.photos.forEach((photo: string) => {
        const photoPath = path.join(UPLOADS_DIR, photo);
        if (fs.existsSync(photoPath)) {
          zip.addLocalFile(photoPath, 'ft');
        }
      });
    });

    const buffer = zip.toBuffer();
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename=catalog_${catalog.slug}.zip`);
    res.send(buffer);
  });

  app.post('/api/import/catalog/:id', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    try {
      const zip = new AdmZip(req.file.path);
      const zipEntries = zip.getEntries();
      
      const dataEntry = zipEntries.find(e => e.entryName === 'data.json');
      if (!dataEntry) throw new Error('data.json not found in zip');
      
      const { catalog: importedCatalog, products: importedProducts } = JSON.parse(dataEntry.getData().toString('utf8'));
      
      // Update catalog
      const catalogs = readDB('catalogs');
      const cIdx = catalogs.findIndex((c: any) => c.id === req.params.id);
      if (cIdx !== -1) {
        catalogs[cIdx] = { ...catalogs[cIdx], ...importedCatalog, id: req.params.id };
        writeDB('catalogs', catalogs);
      }

      // Update products
      let products = readDB('products');
      // Remove existing products for this catalog
      products = products.filter((p: any) => p.catalogId !== req.params.id);
      // Add imported products
      const newProducts = importedProducts.map((p: any) => ({ ...p, catalogId: req.params.id }));
      products.push(...newProducts);
      writeDB('products', products);

      // Extract photos
      zipEntries.forEach(entry => {
        if (entry.entryName.startsWith('ft/')) {
          const fileName = entry.entryName.replace('ft/', '');
          const destPath = path.join(UPLOADS_DIR, fileName);
          fs.writeFileSync(destPath, entry.getData());
        }
      });

      // Cleanup uploaded zip
      fs.unlinkSync(req.file.path);
      
      res.json({ message: 'Catalog imported successfully' });
    } catch (error: any) {
      console.error('Import error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
