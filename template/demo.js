window.MTYPE_DEMO_DATA = {
  orders: Array.from({ length: 24 }, (_, i) => ({
    id: `demo-${i + 1}`,
    orderedAt: `2026-09-${String(i + 1).padStart(2, '0')}T${i % 5 === 0 ? '12:10' : i % 3 === 0 ? '22:15' : '21:30'}:00+08:00`,
    status: 'completed', currency: 'CNY', amount: [24.9, 19.9, 29.9][i % 3], discountAmount: i % 4 ? 5 : 0,
    items: i % 4 === 0 ? [{ productName: '麦辣鸡腿堡', quantity: 1, tags: ['classic'] }, { productName: '薯条', quantity: 1, tags: ['classic'] }] : [{ productName: '巨无霸', quantity: 1, tags: ['classic'] }, { productName: i % 3 ? '薯条' : '可乐', quantity: 1, tags: ['classic'] }]
  }))
};
