const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  // Only seed if database is empty — prevents wiping data on every server restart
  const count = await prisma.user.count()
  if (count > 0) {
    console.log('✅ Database already seeded — skipping.')
    return
  }
  console.log('🌱 Seeding OrderlyX with demo data…')

  await prisma.productTagAssignment.deleteMany()
  await prisma.productTag.deleteMany()
  await prisma.stockTransferItem.deleteMany()
  await prisma.stockTransfer.deleteMany()
  await prisma.stockAlert.deleteMany()
  await prisma.priceHistory.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.shipment.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.order.deleteMany()
  await prisma.product.deleteMany()
  await prisma.subCategory.deleteMany()
  await prisma.category.deleteMany()
  await prisma.supplierContact.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.warehouse.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.discountRule.deleteMany()
  await prisma.reorderRequest.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.user.deleteMany()

  const hash = (p) => bcrypt.hash(p, 10)

  // Users
  const [admin, manager, staff] = await Promise.all([
    prisma.user.create({ data: { name: 'Alex Morgan', email: 'admin@orderlyx.com', password: await hash('admin123'), role: 'ADMIN', phone: '0300-1234567' } }),
    prisma.user.create({ data: { name: 'Sara Khan', email: 'manager@orderlyx.com', password: await hash('manager123'), role: 'MANAGER', phone: '0311-2345678' } }),
    prisma.user.create({ data: { name: 'Ahmed Raza', email: 'viewer@orderlyx.com', password: await hash('viewer123'), role: 'VIEWER', phone: '0344-4567890' } }),
    prisma.user.create({ data: { name: 'Usman Ali', email: 'staff@orderlyx.com', password: await hash('staff123'), role: 'STAFF', phone: '0333-3456789' } }),
  ])

  // Warehouses
  const [mainWH, secondary] = await Promise.all([
    prisma.warehouse.create({ data: { name: 'Main Warehouse', address: 'Plot 45, Industrial Area', city: 'Karachi', country: 'Pakistan', phone: '021-111222333', isMain: true } }),
    prisma.warehouse.create({ data: { name: 'North Store', address: 'F-8 Markaz', city: 'Islamabad', country: 'Pakistan', phone: '051-333444555' } }),
  ])

  // Categories
  const [electronics, office, furniture, networking, packaging] = await Promise.all([
    prisma.category.create({ data: { name: 'Electronics', description: 'Electronic devices and components', color: '#6366f1', icon: 'cpu' } }),
    prisma.category.create({ data: { name: 'Office Supplies', description: 'Stationery and office materials', color: '#f59e0b', icon: 'pencil' } }),
    prisma.category.create({ data: { name: 'Furniture', description: 'Office and warehouse furniture', color: '#10b981', icon: 'armchair' } }),
    prisma.category.create({ data: { name: 'Networking', description: 'Network hardware and cables', color: '#8b5cf6', icon: 'wifi' } }),
    prisma.category.create({ data: { name: 'Packaging', description: 'Boxes and packing materials', color: '#ef4444', icon: 'package' } }),
  ])

  // Sub Categories
  const [laptops, monitors, keyboards, pens, paper, chairs, desks, switches, cables] = await Promise.all([
    prisma.subCategory.create({ data: { name: 'Laptops', categoryId: electronics.id } }),
    prisma.subCategory.create({ data: { name: 'Monitors', categoryId: electronics.id } }),
    prisma.subCategory.create({ data: { name: 'Keyboards & Mice', categoryId: electronics.id } }),
    prisma.subCategory.create({ data: { name: 'Writing Tools', categoryId: office.id } }),
    prisma.subCategory.create({ data: { name: 'Paper Products', categoryId: office.id } }),
    prisma.subCategory.create({ data: { name: 'Chairs', categoryId: furniture.id } }),
    prisma.subCategory.create({ data: { name: 'Desks', categoryId: furniture.id } }),
    prisma.subCategory.create({ data: { name: 'Switches & Routers', categoryId: networking.id } }),
    prisma.subCategory.create({ data: { name: 'Cables & Connectors', categoryId: networking.id } }),
  ])

  // Suppliers
  const [techVault, officeWorld, furniPro, packMaster] = await Promise.all([
    prisma.supplier.create({ data: { name: 'TechVault Inc.', email: 'orders@techvault.com', phone: '+1-555-0101', address: '123 Silicon Ave', city: 'San Francisco', country: 'USA', taxId: 'TV-USA-001', creditLimit: 5000000, paymentTerms: 30, status: 'ACTIVE', rating: 5 } }),
    prisma.supplier.create({ data: { name: 'OfficeWorld Co.', email: 'supply@officeworld.com', phone: '+1-555-0202', address: '456 Paper St', city: 'Chicago', country: 'USA', taxId: 'OW-USA-002', creditLimit: 2000000, paymentTerms: 15, status: 'ACTIVE', rating: 4 } }),
    prisma.supplier.create({ data: { name: 'FurniPro Ltd.', email: 'info@furnipro.com', phone: '+44-20-5555', address: '789 Oak Lane', city: 'London', country: 'UK', taxId: 'FP-UK-003', creditLimit: 3000000, paymentTerms: 45, status: 'ACTIVE', rating: 4 } }),
    prisma.supplier.create({ data: { name: 'PackMaster', email: 'bulk@packmaster.com', phone: '+1-555-0404', address: '321 Box Blvd', city: 'Dallas', country: 'USA', creditLimit: 1000000, paymentTerms: 30, status: 'INACTIVE', rating: 3 } }),
  ])

  // Supplier contacts
  await Promise.all([
    prisma.supplierContact.create({ data: { supplierId: techVault.id, name: 'John Smith', designation: 'Sales Manager', email: 'john@techvault.com', phone: '+1-555-0111', isPrimary: true } }),
    prisma.supplierContact.create({ data: { supplierId: officeWorld.id, name: 'Lisa Chen', designation: 'Account Executive', email: 'lisa@officeworld.com', phone: '+1-555-0222', isPrimary: true } }),
  ])

  // Customers
  await Promise.all([
    prisma.customer.create({ data: { name: 'Acme Corporation', email: 'procurement@acme.com', phone: '+1-555-9001', city: 'New York', country: 'USA', creditLimit: 2000000, totalPurchases: 850000 } }),
    prisma.customer.create({ data: { name: 'Global Tech Ltd.', email: 'orders@globaltech.com', phone: '+44-20-9002', city: 'London', country: 'UK', creditLimit: 1500000, totalPurchases: 320000 } }),
    prisma.customer.create({ data: { name: 'City Schools Authority', email: 'supplies@cityschools.pk', phone: '021-9003', city: 'Karachi', country: 'Pakistan', creditLimit: 500000, totalPurchases: 125000 } }),
  ])

  // Products
  const products = await Promise.all([
    prisma.product.create({ data: { name: 'MacBook Pro 14"', sku: 'MBP-14-M3', barcode: '1234567890001', description: 'Apple MacBook Pro 14" M3 chip 16GB RAM 512GB SSD', costPrice: 1700.00, sellingPrice: 1999.99, quantity: 24, reorderLevel: 5, maxStockLevel: 50, unit: 'units', weight: 1.6, status: 'ACTIVE', taxRate: 5, categoryId: electronics.id, subCategoryId: laptops.id, supplierId: techVault.id, warehouseId: mainWH.id } }),
    prisma.product.create({ data: { name: 'Dell UltraSharp 27"', sku: 'DEL-U27-4K', barcode: '1234567890002', description: 'Dell UltraSharp 27" 4K IPS USB-C Monitor', costPrice: 520.00, sellingPrice: 649.99, quantity: 8, reorderLevel: 10, maxStockLevel: 40, unit: 'units', weight: 6.5, status: 'ACTIVE', taxRate: 5, categoryId: electronics.id, subCategoryId: monitors.id, supplierId: techVault.id, warehouseId: mainWH.id } }),
    prisma.product.create({ data: { name: 'Logitech MX Keys', sku: 'LOG-MX-KEYS', barcode: '1234567890003', description: 'Logitech MX Keys wireless keyboard', costPrice: 90.00, sellingPrice: 129.99, quantity: 47, reorderLevel: 15, maxStockLevel: 100, unit: 'units', weight: 0.8, status: 'ACTIVE', taxRate: 5, categoryId: electronics.id, subCategoryId: keyboards.id, supplierId: techVault.id, warehouseId: mainWH.id } }),
    prisma.product.create({ data: { name: 'Ergonomic Pro Mouse', sku: 'ERG-MS-PRO', barcode: '1234567890004', description: 'Vertical ergonomic wireless mouse', costPrice: 45.00, sellingPrice: 79.99, quantity: 3, reorderLevel: 20, maxStockLevel: 80, unit: 'units', weight: 0.15, status: 'ACTIVE', taxRate: 5, categoryId: electronics.id, subCategoryId: keyboards.id, supplierId: techVault.id, warehouseId: mainWH.id } }),
    prisma.product.create({ data: { name: 'Premium A4 Paper 500sh', sku: 'PAP-A4-500', barcode: '1234567890005', description: '80gsm premium white copy paper, 500 sheets', costPrice: 6.50, sellingPrice: 12.99, quantity: 320, reorderLevel: 50, maxStockLevel: 1000, unit: 'reams', status: 'ACTIVE', taxRate: 0, categoryId: office.id, subCategoryId: paper.id, supplierId: officeWorld.id, warehouseId: mainWH.id } }),
    prisma.product.create({ data: { name: 'Ballpoint Pens Pack 12', sku: 'PEN-BP-BLU12', barcode: '1234567890006', description: 'Blue ballpoint pens pack of 12', costPrice: 3.50, sellingPrice: 8.99, quantity: 145, reorderLevel: 30, maxStockLevel: 500, unit: 'packs', status: 'ACTIVE', taxRate: 0, categoryId: office.id, subCategoryId: pens.id, supplierId: officeWorld.id, warehouseId: mainWH.id } }),
    prisma.product.create({ data: { name: 'Executive Office Chair', sku: 'CHR-EXEC-BLK', barcode: '1234567890007', description: 'Ergonomic leather executive office chair', costPrice: 310.00, sellingPrice: 449.99, quantity: 12, reorderLevel: 3, maxStockLevel: 30, unit: 'units', weight: 18.0, status: 'ACTIVE', taxRate: 0, categoryId: furniture.id, subCategoryId: chairs.id, supplierId: furniPro.id, warehouseId: mainWH.id } }),
    prisma.product.create({ data: { name: 'Electric Standing Desk', sku: 'DSK-ELEC-160', barcode: '1234567890008', description: 'Electric height-adjustable standing desk 160cm', costPrice: 580.00, sellingPrice: 799.99, quantity: 7, reorderLevel: 3, maxStockLevel: 20, unit: 'units', weight: 42.0, status: 'ACTIVE', taxRate: 0, categoryId: furniture.id, subCategoryId: desks.id, supplierId: furniPro.id, warehouseId: mainWH.id } }),
    prisma.product.create({ data: { name: 'Cisco Switch 24-Port', sku: 'NET-SW-24G', barcode: '1234567890009', description: 'Cisco Catalyst 24-port gigabit managed switch', costPrice: 440.00, sellingPrice: 599.99, quantity: 5, reorderLevel: 3, maxStockLevel: 20, unit: 'units', weight: 4.5, status: 'ACTIVE', taxRate: 5, categoryId: networking.id, subCategoryId: switches.id, supplierId: techVault.id, warehouseId: mainWH.id } }),
    prisma.product.create({ data: { name: 'Cat6 Ethernet 10m', sku: 'NET-CAT6-10', barcode: '1234567890010', description: 'Shielded Cat6 patch cable 10 meters', costPrice: 5.00, sellingPrice: 14.99, quantity: 200, reorderLevel: 50, maxStockLevel: 500, unit: 'units', weight: 0.2, status: 'ACTIVE', taxRate: 0, categoryId: networking.id, subCategoryId: cables.id, supplierId: techVault.id, warehouseId: mainWH.id } }),
    prisma.product.create({ data: { name: 'USB-C Hub 7-in-1', sku: 'USB-HUB-7C', barcode: '1234567890011', description: 'USB-C hub with HDMI, USB 3.0, SD card, Ethernet', costPrice: 28.00, sellingPrice: 59.99, quantity: 0, reorderLevel: 15, maxStockLevel: 60, unit: 'units', weight: 0.12, status: 'ACTIVE', taxRate: 5, categoryId: electronics.id, subCategoryId: keyboards.id, supplierId: techVault.id, warehouseId: secondaryWH() } }),
    prisma.product.create({ data: { name: 'Cardboard Box 20x20', sku: 'BOX-CARD-SM', barcode: '1234567890012', description: 'Single wall corrugated shipping box 20x20x20cm', costPrice: 0.90, sellingPrice: 2.49, quantity: 6, reorderLevel: 100, maxStockLevel: 1000, unit: 'units', status: 'ACTIVE', taxRate: 0, categoryId: packaging.id, supplierId: packMaster.id, warehouseId: mainWH.id } }),
    prisma.product.create({ data: { name: 'Bubble Wrap Roll 50m', sku: 'BWRAP-50M', barcode: '1234567890013', description: 'Small bubble protective wrap roll 50 meters', costPrice: 9.00, sellingPrice: 18.99, quantity: 38, reorderLevel: 10, maxStockLevel: 80, unit: 'rolls', status: 'ACTIVE', taxRate: 0, categoryId: packaging.id, supplierId: packMaster.id, warehouseId: mainWH.id } }),
    prisma.product.create({ data: { name: 'HP LaserJet Printer', sku: 'HP-LJ-4001', barcode: '1234567890014', description: 'HP LaserJet Pro 4001dn duplex network printer', costPrice: 320.00, sellingPrice: 449.00, quantity: 4, reorderLevel: 2, maxStockLevel: 15, unit: 'units', weight: 8.2, status: 'ACTIVE', taxRate: 5, categoryId: electronics.id, supplierId: techVault.id, warehouseId: mainWH.id } }),
    prisma.product.create({ data: { name: 'Office Bookshelf 5-Tier', sku: 'SHELF-5T-OAK', barcode: '1234567890015', description: '5-tier wooden bookshelf for office use', costPrice: 95.00, sellingPrice: 149.99, quantity: 9, reorderLevel: 3, maxStockLevel: 25, unit: 'units', weight: 22.0, status: 'ACTIVE', taxRate: 0, categoryId: furniture.id, subCategoryId: desks.id, supplierId: furniPro.id, warehouseId: mainWH.id } }),
  ])

  function secondaryWH() { return secondary.id }

  // Price history
  await Promise.all([
    prisma.priceHistory.create({ data: { productId: products[0].id, oldPrice: 1899.99, newPrice: 1999.99, changedBy: admin.name, reason: 'Market price adjustment' } }),
    prisma.priceHistory.create({ data: { productId: products[1].id, oldPrice: 599.99, newPrice: 649.99, changedBy: admin.name, reason: 'Supplier price increase' } }),
  ])

  // Stock Alerts
  await Promise.all([
    prisma.stockAlert.create({ data: { productId: products[3].id, type: 'LOW_STOCK', severity: 'HIGH', message: 'Ergonomic Pro Mouse stock critically low (3 units). Reorder level is 20.' } }),
    prisma.stockAlert.create({ data: { productId: products[10].id, type: 'OUT_OF_STOCK', severity: 'CRITICAL', message: 'USB-C Hub 7-in-1 is completely out of stock!' } }),
    prisma.stockAlert.create({ data: { productId: products[11].id, type: 'LOW_STOCK', severity: 'CRITICAL', message: 'Cardboard boxes at 6 units — far below reorder level of 100.' } }),
  ])

  // Tags
  const [premiumTag, fastMovingTag, fragileTag] = await Promise.all([
    prisma.productTag.create({ data: { name: 'Premium', color: '#f59e0b' } }),
    prisma.productTag.create({ data: { name: 'Fast Moving', color: '#10b981' } }),
    prisma.productTag.create({ data: { name: 'Fragile', color: '#ef4444' } }),
  ])

  await Promise.all([
    prisma.productTagAssignment.create({ data: { productId: products[0].id, tagId: premiumTag.id } }),
    prisma.productTagAssignment.create({ data: { productId: products[6].id, tagId: premiumTag.id } }),
    prisma.productTagAssignment.create({ data: { productId: products[4].id, tagId: fastMovingTag.id } }),
    prisma.productTagAssignment.create({ data: { productId: products[5].id, tagId: fastMovingTag.id } }),
    prisma.productTagAssignment.create({ data: { productId: products[1].id, tagId: fragileTag.id } }),
  ])

  // Orders
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'PO-2025-001', type: 'PURCHASE', status: 'COMPLETED',
      totalAmount: 51349.76, discount: 0, taxAmount: 2349.76,
      notes: 'Monthly tech restock — Q1 2025', userId: admin.id, supplierId: techVault.id,
      expectedDate: new Date('2025-02-15'), completedAt: new Date('2025-02-14'),
      items: { create: [
        { productId: products[0].id, quantity: 20, unitPrice: 1700.00, subtotal: 34000.00 },
        { productId: products[1].id, quantity: 15, unitPrice: 520.00, subtotal: 7800.00 },
        { productId: products[2].id, quantity: 40, unitPrice: 90.00, subtotal: 3600.00 },
        { productId: products[8].id, quantity: 8, unitPrice: 440.00, subtotal: 3520.00 },
      ]}
    }
  })

  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'SO-2025-001', type: 'SALE', status: 'COMPLETED',
      totalAmount: 11549.88, discount: 500, taxAmount: 524.88,
      notes: 'Corporate sale — Acme Corporation', userId: staff.id,
      items: { create: [
        { productId: products[0].id, quantity: 5, unitPrice: 1999.99, subtotal: 9999.95 },
        { productId: products[2].id, quantity: 8, unitPrice: 129.99, subtotal: 1039.92 },
        { productId: products[3].id, quantity: 3, unitPrice: 79.99, subtotal: 239.97 },
      ]}
    }
  })

  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'PO-2025-002', type: 'PURCHASE', status: 'PENDING',
      totalAmount: 14250.00, discount: 0, taxAmount: 0,
      notes: 'Furniture restock for new office wing', userId: manager.id, supplierId: furniPro.id,
      expectedDate: new Date('2025-06-01'),
      items: { create: [
        { productId: products[6].id, quantity: 20, unitPrice: 310.00, subtotal: 6200.00 },
        { productId: products[7].id, quantity: 10, unitPrice: 580.00, subtotal: 5800.00 },
        { productId: products[14].id, quantity: 25, unitPrice: 95.00, subtotal: 2375.00 },
      ]}
    }
  })

  const order4 = await prisma.order.create({
    data: {
      orderNumber: 'SO-2025-002', type: 'SALE', status: 'CONFIRMED',
      totalAmount: 5249.94, discount: 200, taxAmount: 0,
      notes: 'Global Tech quarterly order', userId: staff.id,
      items: { create: [
        { productId: products[7].id, quantity: 6, unitPrice: 799.99, subtotal: 4799.94 },
        { productId: products[14].id, quantity: 3, unitPrice: 149.99, subtotal: 449.97 },
      ]}
    }
  })

  // Payments
  await Promise.all([
    prisma.payment.create({ data: { orderId: order1.id, supplierId: techVault.id, amount: 51349.76, method: 'BANK_TRANSFER', status: 'PAID', referenceNo: 'TXN-2025-0201', paidAt: new Date('2025-02-20'), dueDate: new Date('2025-03-15') } }),
    prisma.payment.create({ data: { orderId: order2.id, amount: 11549.88, method: 'BANK_TRANSFER', status: 'PAID', referenceNo: 'TXN-2025-0215', paidAt: new Date('2025-02-15') } }),
    prisma.payment.create({ data: { orderId: order3.id, supplierId: furniPro.id, amount: 14250.00, method: 'BANK_TRANSFER', status: 'PENDING', dueDate: new Date('2025-07-01') } }),
    prisma.payment.create({ data: { orderId: order4.id, amount: 5249.94, method: 'CREDIT', status: 'PENDING', dueDate: new Date('2025-05-30') } }),
  ])

  // Shipments
  await Promise.all([
    prisma.shipment.create({ data: { orderId: order1.id, trackingNumber: 'DHL-2025-001234', carrier: 'DHL', shippedAt: new Date('2025-02-10'), expectedAt: new Date('2025-02-15'), deliveredAt: new Date('2025-02-14'), status: 'delivered' } }),
    prisma.shipment.create({ data: { orderId: order3.id, carrier: 'FedEx', expectedAt: new Date('2025-06-01'), status: 'pending' } }),
  ])

  // Discount rules
  await Promise.all([
    prisma.discountRule.create({ data: { name: 'Bulk Electronics 10%', description: 'Buy 5+ electronics get 10% off', discountType: 'percentage', value: 10, minQuantity: 5, isActive: true } }),
    prisma.discountRule.create({ data: { name: 'Summer Sale 15%', description: 'Seasonal discount on furniture', discountType: 'percentage', value: 15, startDate: new Date('2025-06-01'), endDate: new Date('2025-08-31'), isActive: true } }),
    prisma.discountRule.create({ data: { name: 'Order above $5000', description: 'Fixed $200 off orders above $5000', discountType: 'fixed', value: 200, minAmount: 5000, isActive: true } }),
  ])

  // Reorder requests
  await Promise.all([
    prisma.reorderRequest.create({ data: { productId: products[3].id, productName: 'Ergonomic Pro Mouse', sku: 'ERG-MS-PRO', currentQty: 3, requestedQty: 50, supplierId: techVault.id, supplierName: 'TechVault Inc.', status: 'pending' } }),
    prisma.reorderRequest.create({ data: { productId: products[10].id, productName: 'USB-C Hub 7-in-1', sku: 'USB-HUB-7C', currentQty: 0, requestedQty: 30, supplierId: techVault.id, supplierName: 'TechVault Inc.', status: 'pending' } }),
    prisma.reorderRequest.create({ data: { productId: products[11].id, productName: 'Cardboard Box 20x20', sku: 'BOX-CARD-SM', currentQty: 6, requestedQty: 500, supplierId: packMaster.id, supplierName: 'PackMaster', status: 'pending' } }),
  ])

  // Audit logs
  await Promise.all([
    prisma.auditLog.create({ data: { userId: admin.id, action: 'CREATE', tableName: 'products', recordId: products[0].id, newValues: JSON.stringify({ name: 'MacBook Pro 14"', sku: 'MBP-14-M3' }) } }),
    prisma.auditLog.create({ data: { userId: admin.id, action: 'LOGIN', tableName: 'users', recordId: admin.id } }),
    prisma.auditLog.create({ data: { userId: manager.id, action: 'LOGIN', tableName: 'users', recordId: manager.id } }),
  ])

  console.log('✅ OrderlyX seeded successfully!')
  console.log('\n📋 Login Credentials:')
  console.log('   Admin   → admin@orderlyx.com   / admin123')
  console.log('   Manager → manager@orderlyx.com / manager123')
  console.log('   Staff   → staff@orderlyx.com   / staff123')
}

main().catch(console.error).finally(() => prisma.$disconnect())
