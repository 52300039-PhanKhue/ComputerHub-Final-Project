require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectMongoDB = require('./mongodb');
const {
  User, Address, Category, Product, ProductImage, Variant, Review, Discount,
  Order, OrderItem, OrderStatusHistory, PasswordReset, nextId, ensureCounterAtLeast
} = require('./models');

const products = [
  ['AstraBook Pro 14','astrabook-pro-14','Astra','laptops',25990000,1,18,'Laptop mỏng nhẹ cao cấp cho học tập, lập trình và làm việc di động.','Màn hình 14 inch độ phân giải cao, viền mỏng.\nCPU hiệu năng cao, tối ưu lập trình và đa nhiệm.\nPin dùng dài, hỗ trợ sạc nhanh qua USB-C.\nBàn phím hành trình tốt, touchpad kính kích thước lớn.\nKhung kim loại chắc chắn, trọng lượng nhẹ để mang theo mỗi ngày.'],
  ['Nova Gaming 16','nova-gaming-16','Nova','laptops',34990000,1,42,'Laptop gaming 16 inch mạnh mẽ với GPU rời và tản nhiệt kép.','Màn hình 16 inch tần số quét cao cho game tốc độ nhanh.\nGPU rời phục vụ gaming, AI và dựng hình 3D.\nHệ thống tản nhiệt hai quạt với nhiều ống dẫn nhiệt.\nBàn phím RGB, hành trình phím rõ và cụm phím đầy đủ.\nNhiều cổng kết nối cho màn hình, mạng LAN và thiết bị ngoại vi.'],
  ['Orbit Air 13','orbit-air-13','Orbit','laptops',19990000,1,8,'Ultrabook 13 inch nhỏ gọn cho sinh viên và người thường xuyên di chuyển.','Thiết kế siêu gọn, phù hợp balo nhỏ.\nMàn hình sáng và màu sắc cân bằng cho học tập.\nCPU tiết kiệm điện nhưng vẫn đủ mạnh cho công việc văn phòng.\nWebcam rõ nét cho học và họp trực tuyến.\nSạc USB-C nhỏ gọn, thuận tiện khi mang theo.'],
  ['PixelView 27 QHD','pixelview-27-qhd','PixelView','monitors',7290000,0,68,'Màn hình 27 inch QHD cân bằng giữa làm việc, học tập và giải trí.','Tấm nền IPS góc nhìn rộng và màu sắc ổn định.\nĐộ phân giải QHD hiển thị nhiều nội dung hơn Full HD.\nTần số quét cao giúp cuộn trang và chơi game mượt hơn.\nChân đế công thái học hỗ trợ thay đổi độ cao và góc nghiêng.\nNhiều cổng kết nối cho laptop và máy tính để bàn.'],
  ['CreatorView 32 4K','creatorview-32-4k','CreatorView','monitors',11990000,1,29,'Màn hình 32 inch 4K hướng tới thiết kế, dựng phim và sáng tạo nội dung.','Độ phân giải 4K cho hình ảnh chi tiết và không gian làm việc rộng.\nKhông gian màu rộng, phù hợp chỉnh ảnh và video.\nUSB-C hỗ trợ truyền hình ảnh và cấp nguồn cho laptop.\nChân đế linh hoạt, hỗ trợ xoay và nâng hạ.\nChế độ bảo vệ mắt cho thời gian làm việc dài.'],
  ['SwiftPanel 24 FHD','swiftpanel-24-fhd','SwiftPanel','monitors',3290000,0,82,'Màn hình 24 inch Full HD tốc độ cao cho học tập và gaming phổ thông.','Kích thước 24 inch dễ bố trí trên bàn nhỏ.\nĐộ phân giải Full HD rõ nét cho công việc hằng ngày.\nTần số quét cao, phản hồi nhanh khi chơi game.\nViền mỏng phù hợp thiết lập nhiều màn hình.\nHỗ trợ treo VESA và nhiều chế độ hiển thị.'],
  ['Titan RTX 5070','titan-rtx-5070','Titan','graphics-cards',18990000,1,55,'Card đồ họa hiệu năng cao dành cho gaming, AI và dựng hình.','Hiệu năng đồ họa mạnh ở độ phân giải cao.\nBộ nhớ tốc độ cao cho game và tác vụ sáng tạo.\nRay tracing thế hệ mới cho hiệu ứng ánh sáng thực tế.\nTản nhiệt ba quạt giúp duy trì nhiệt độ ổn định.\nPhù hợp máy gaming cao cấp và workstation cá nhân.'],
  ['Vortex RX 8800','vortex-rx-8800','Vortex','graphics-cards',16990000,0,46,'GPU cân bằng giá và hiệu năng cho gaming độ phân giải cao.','Kiến trúc đồ họa tối ưu cho hiệu suất trên mỗi watt.\nBộ nhớ dung lượng lớn cho texture độ phân giải cao.\nHệ thống quạt bán thụ động giảm tiếng ồn khi tải nhẹ.\nBackplate kim loại tăng độ cứng cho bo mạch.\nHỗ trợ nhiều màn hình độ phân giải cao.'],
  ['ArcForge A770 Creator','arcforge-a770-creator','ArcForge','graphics-cards',10990000,0,31,'Card đồ họa hướng đến creator, encode video và công việc đồ họa.','Bộ xử lý media tối ưu cho nhiều chuẩn video hiện đại.\nBộ nhớ lớn cho timeline và texture nặng.\nThiết kế hai quạt gọn gàng, dễ lắp nhiều loại case.\nHỗ trợ tăng tốc các ứng dụng sáng tạo tương thích.\nCổng xuất hình đa dạng cho hệ thống nhiều màn hình.'],
  ['ZenCore X9','zencore-x9','ZenCore','processors',12990000,0,74,'CPU đa nhân mạnh cho biên dịch, render và đa nhiệm nặng.','Số nhân và luồng cao cho workload chuyên nghiệp.\nXung nhịp boost cao cho ứng dụng cần phản hồi nhanh.\nHỗ trợ bộ nhớ tốc độ cao và nền tảng hiện đại.\nTối ưu hiệu suất điện năng khi chạy dài.\nPhù hợp máy lập trình, workstation và gaming cao cấp.'],
  ['CoreNova i7 14700','corenova-i7-14700','CoreNova','processors',10490000,0,65,'CPU hiệu năng cao cho gaming, làm việc và sáng tạo nội dung.','Kiến trúc nhiều nhân hỗn hợp cho đa nhiệm tốt.\nHiệu năng đơn nhân cao cho game và ứng dụng phản hồi nhanh.\nHỗ trợ nền tảng bộ nhớ tốc độ cao.\nPhù hợp cả máy học tập cao cấp lẫn workstation.\nCó nhiều lựa chọn tản nhiệt tương thích trên thị trường.'],
  ['RyzenEdge R7 9700X','ryzenedge-r7-9700x','RyzenEdge','processors',8990000,1,39,'CPU 8 nhân hiện đại, cân bằng gaming và xử lý công việc.','Tám nhân hiệu năng cao cho nhiều tác vụ đồng thời.\nHiệu suất điện năng tốt khi render và compile.\nHỗ trợ PCIe thế hệ mới cho SSD và GPU tốc độ cao.\nNền tảng nâng cấp linh hoạt cho cấu hình lâu dài.\nPhù hợp gaming, code, chỉnh sửa ảnh và video.'],
  ['FlashDrive NVMe 2TB','flashdrive-nvme-2tb','FlashDrive','storage',3990000,0,90,'SSD NVMe 2TB tốc độ cao cho hệ điều hành, game và dự án lớn.','Tốc độ đọc ghi cao giúp khởi động và tải dữ liệu nhanh.\nDung lượng 2TB phù hợp game, video và máy ảo.\nChuẩn NVMe hiện đại cho độ trễ thấp.\nThiết kế gọn, dễ lắp trên laptop và desktop.\nBảo hành dài hạn cho nhu cầu sử dụng thường xuyên.'],
  ['ByteVault SSD 1TB','bytevault-ssd-1tb','ByteVault','storage',2190000,0,78,'SSD 1TB nhanh và ổn định cho nâng cấp máy học tập hoặc văn phòng.','Dung lượng 1TB đủ cho hệ điều hành và nhiều ứng dụng.\nTốc độ cao hơn ổ cứng cơ truyền thống.\nTiêu thụ điện thấp và vận hành êm.\nThiết kế bền, không có bộ phận chuyển động.\nPhù hợp nâng cấp laptop hoặc desktop phổ thông.'],
  ['IronDisk HDD 4TB','irondisk-hdd-4tb','IronDisk','storage',2490000,0,51,'Ổ cứng 4TB dành cho lưu trữ dữ liệu dung lượng lớn.','Dung lượng cao cho ảnh, video và bản sao lưu.\nHoạt động ổn định cho lưu trữ lâu dài.\nBộ nhớ đệm hỗ trợ truy xuất dữ liệu thường dùng.\nTương thích nhiều case máy tính để bàn.\nPhù hợp kho dữ liệu gia đình và văn phòng nhỏ.'],
  ['HyperRAM 32GB DDR5','hyperram-32gb-ddr5','HyperRAM','memory',2690000,1,86,'Bộ nhớ DDR5 32GB cho đa nhiệm, gaming và ứng dụng nặng.','Dung lượng 32GB giúp chạy nhiều ứng dụng cùng lúc.\nBus cao cho băng thông bộ nhớ tốt.\nĐộ trễ được tối ưu cho hiệu năng thực tế.\nTản nhiệt nhôm hỗ trợ duy trì nhiệt độ ổn định.\nPhù hợp gaming, code, máy ảo và sáng tạo nội dung.'],
  ['PulseRAM 16GB DDR5','pulseram-16gb-ddr5','PulseRAM','memory',1390000,0,102,'RAM DDR5 16GB giá hợp lý cho máy học tập và gaming phổ thông.','Dung lượng 16GB đáp ứng tốt nhu cầu hằng ngày.\nChuẩn DDR5 cho băng thông cao hơn thế hệ trước.\nHoạt động ổn định trong tác vụ kéo dài.\nTản nhiệt gọn gàng phù hợp nhiều loại case.\nDễ nâng cấp thành cấu hình hai thanh trong tương lai.'],
  ['TitanMemory 64GB Kit','titanmemory-64gb-kit','TitanMemory','memory',5290000,1,33,'Bộ kit DDR5 64GB cho workstation, máy ảo và dự án chuyên nghiệp.','Dung lượng 64GB phù hợp workload bộ nhớ lớn.\nHai thanh đồng bộ cho cấu hình dual-channel.\nBus cao hỗ trợ CPU và nền tảng mới.\nTản nhiệt kim loại chắc chắn, thiết kế hiện đại.\nPhù hợp render, lập trình nặng và nhiều máy ảo.']
];
const demoOrders = [
  ['DEMO-1001',155,18270000,'delivered','pixelview-27-qhd',2],
  ['DEMO-1002',121,11869200,'delivered','zencore-x9',1],
  ['DEMO-1003',88,2690000,'shipping','hyperram-32gb-ddr5',1],
  ['DEMO-1004',54,34990000,'confirmed','nova-gaming-16',1],
  ['DEMO-1005',27,4380000,'delivered','bytevault-ssd-1tb',2],
  ['DEMO-1006',9,7290000,'confirmed','pixelview-27-qhd',1]
];

async function getOrCreateId(Model, counterName, filter, data) {
  let row = await Model.findOne(filter);
  if (row) return row;
  row = await Model.create({ id: await nextId(counterName), ...data });
  return row;
}

async function seed() {
  await connectMongoDB();

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@computerhub.vn').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      id: await nextId('users'), email: adminEmail, full_name: 'ComputerHub Administrator',
      password_hash: bcrypt.hashSync(adminPassword, 12), role: 'admin'
    });
  } else {
    admin.role = 'admin';
    admin.banned = false;
    admin.password_hash = bcrypt.hashSync(adminPassword, 12);
    await admin.save();
  }

  const demoEmail = 'demo@computerhub.vn';
  let demoUser = await User.findOne({ email: demoEmail });
  if (!demoUser) {
    demoUser = await User.create({
      id: await nextId('users'), email: demoEmail, full_name: 'Nguyễn Minh Demo',
      password_hash: bcrypt.hashSync('Demo@123456', 12), role: 'customer', loyalty_points: 320
    });
  } else {
    demoUser.role = 'customer';
    demoUser.banned = false;
    demoUser.password_hash = bcrypt.hashSync('Demo@123456', 12);
    await demoUser.save();
  }

  if (!(await Address.exists({ user_id: demoUser.id }))) {
    await Address.create([
      { id: await nextId('addresses'), user_id: demoUser.id, label: 'Nhà riêng', recipient_name: demoUser.full_name, phone: '0901234567', address_line: '12 Trần Phú, Nha Trang, Khánh Hòa', is_default: true },
      { id: await nextId('addresses'), user_id: demoUser.id, label: 'Văn phòng', recipient_name: demoUser.full_name, phone: '0901234567', address_line: '45 Lê Thánh Tôn, Nha Trang, Khánh Hòa', is_default: false }
    ]);
  }

  const categoryPairs = [
    ['Laptops','laptops'],['Monitors','monitors'],['Graphics Cards','graphics-cards'],
    ['Processors','processors'],['Storage','storage'],['Memory','memory']
  ];
  const catId = {};
  for (const [name, slug] of categoryPairs) {
    let category = await Category.findOne({ slug });
    if (!category) category = await Category.create({ id: await nextId('categories'), name, slug });
    else if (category.name !== name) { category.name = name; await category.save(); }
    catId[slug] = category.id;
  }

  for (const p of products) {
    const [name,slug,brand,categorySlug,base_price,is_new,sold_count,short_description,long_description] = p;
    let product = await Product.findOne({ slug });
    if (!product) {
      product = await Product.create({
        id: await nextId('products'), name, slug, brand, category_id: catId[categorySlug],
        base_price, is_new: Boolean(is_new), sold_count, short_description, long_description, active: true
      });
    } else {
      product.name = name;
      product.brand = brand;
      product.category_id = catId[categorySlug];
      product.base_price = base_price;
      product.is_new = Boolean(is_new);
      product.sold_count = Math.max(Number(product.sold_count || 0), sold_count);
      product.short_description = short_description;
      product.long_description = long_description;
      product.active = true;
      await product.save();
    }

    const skuBase = slug.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,10);
    const variants = [
      ['Standard', `${skuBase}-STD`, base_price, Math.round(base_price*.82), 12],
      ['Premium', `${skuBase}-PRO`, Math.round(base_price*1.15), Math.round(base_price*1.15*.82), 8]
    ];
    for (const [variantName, sku, price, cost_price, initialStock] of variants) {
      let variant = await Variant.findOne({ sku });
      if (!variant) {
        await Variant.create({ id: await nextId('variants'), product_id: product.id, name: variantName, sku, price, cost_price, stock: initialStock });
      } else {
        variant.product_id = product.id;
        variant.name = variantName;
        variant.price = price;
        variant.cost_price = cost_price;
        await variant.save();
      }
    }

    await ProductImage.deleteMany({ product_id: product.id });
    const images = [];
    for (let i=1; i<=3; i++) images.push({ id: await nextId('product_images'), product_id: product.id, url: `/images/products/${slug}-${i}.svg` });
    await ProductImage.insertMany(images);
  }

  let save5 = await Discount.findOne({ code: 'SAVE5' });
  if (!save5) save5 = await Discount.create({ id: await nextId('discounts'), code: 'SAVE5', percent_off: 5, max_uses: 10, used_count: 0 });
  else {
    save5.percent_off = 5;
    save5.max_uses = 10;
    save5.used_count = 0;
    await save5.save();
  }

  for (const [slug, rating, comment] of [
    ['pixelview-27-qhd',5,'Màn hình hiển thị rất nét, chân đế dễ điều chỉnh và màu sắc dễ chịu khi làm việc lâu.'],
    ['zencore-x9',5,'Compile project nhanh, chạy nhiều tác vụ cùng lúc vẫn ổn định.'],
    ['hyperram-32gb-ddr5',4,'Dung lượng thoải mái cho IDE, trình duyệt và máy ảo.'],
    ['nova-gaming-16',5,'Hiệu năng mạnh, màn hình mượt và thiết kế nhìn ngoài đời khá đẹp.']
  ]) {
    const product = await Product.findOne({ slug }).lean();
    if (product && !(await Review.exists({ product_id: product.id, user_id: demoUser.id, comment }))) {
      await Review.create({ id: await nextId('reviews'), product_id: product.id, user_id: demoUser.id, comment, rating });
    }
  }
  for (const [slug, guest_name, comment] of [
    ['astrabook-pro-14','Khách tham khảo','Máy nhẹ, bàn phím dễ gõ. Mình đang cân nhắc bản Premium.'],
    ['flashdrive-nvme-2tb','Minh','Giao diện xem biến thể và tồn kho khá rõ ràng.']
  ]) {
    const product = await Product.findOne({ slug }).lean();
    if (product && !(await Review.exists({ product_id: product.id, guest_name, comment }))) {
      await Review.create({ id: await nextId('reviews'), product_id: product.id, guest_name, comment, rating: null });
    }
  }

  for (const [orderNumber,daysAgo,_legacyTotal,status,slug,qty] of demoOrders) {
    if (await Order.exists({ order_number: orderNumber })) continue;
    const product = await Product.findOne({ slug }).lean();
    if (!product) continue;
    const variant = await Variant.findOne({ product_id: product.id }).sort({ id: 1 }).lean();
    if (!variant) continue;
    const created_at = new Date(Date.now()-daysAgo*86400000);
    const subtotal = variant.price*qty;
    const tax = Math.round(subtotal*0.08);
    const shipping_fee = subtotal>=20000000?0:50000;
    const total = subtotal+tax+shipping_fee;
    const order = await Order.create({
      id: await nextId('orders'), order_number: orderNumber, user_id: demoUser.id, subtotal, tax, shipping_fee,
      discount_amount: 0, points_used: 0, total, profit: Math.max(0,(variant.price-variant.cost_price)*qty),
      discount_code: null, shipping_name: demoUser.full_name, shipping_phone: '0901234567',
      shipping_address: '12 Trần Phú, Nha Trang, Khánh Hòa', payment_method: 'COD', status, created_at
    });
    await OrderItem.create({
      id: await nextId('order_items'), order_id: order.id, product_id: product.id, variant_id: variant.id,
      product_name: product.name, variant_name: variant.name, unit_price: variant.price, unit_cost: variant.cost_price, quantity: qty
    });
    const historyStates = status==='delivered' ? ['pending','confirmed','shipping','delivered'] : status==='shipping' ? ['pending','confirmed','shipping'] : status==='confirmed' ? ['pending','confirmed'] : ['pending'];
    for (let index=0; index<historyStates.length; index++) {
      await OrderStatusHistory.create({
        id: await nextId('order_status_history'), order_id: order.id, status: historyStates[index],
        created_at: new Date(created_at.getTime() + index*3600000)
      });
    }
  }

  const tracked = [
    ['users', User], ['addresses', Address], ['categories', Category], ['products', Product],
    ['product_images', ProductImage], ['variants', Variant], ['reviews', Review], ['discounts', Discount],
    ['orders', Order], ['order_items', OrderItem], ['order_status_history', OrderStatusHistory], ['password_resets', PasswordReset]
  ];
  for (const [name, Model] of tracked) {
    const top = await Model.findOne().sort({ id: -1 }).select({ id: 1 }).lean();
    await ensureCounterAtLeast(name, top?.id || 0);
  }

  console.log('MongoDB seeded successfully with the enhanced ComputerHub demo catalog.');
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);
  console.log('Demo customer: demo@computerhub.vn / Demo@123456');
}

seed().then(() => process.exit(0)).catch(error => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
