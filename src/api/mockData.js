const generateMockData = () => {
  const data = [];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Income entries
  data.push({
    id: 101,
    type: 'income',
    amount: 45000,
    category: 'เงินเดือน',
    date: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    note: 'เงินเดือน'
  });
  data.push({
    id: 102,
    type: 'income',
    amount: 5000,
    category: 'ลงทุน',
    date: `${year}-${String(month + 1).padStart(2, '0')}-15`,
    note: 'ปันผลหุ้น'
  });

  const expenseCategories = [
    { name: 'มื้อ', min: 50, max: 300 },
    { name: 'ของกิน', min: 20, max: 150 },
    { name: 'เดินทาง', min: 40, max: 100 },
    { name: 'ของใช้ประจำวัน', min: 100, max: 1000 },
    { name: 'บันเทิง', min: 100, max: 500 }
  ];

  const notes = {
    'มื้อ': ['ข้าวราดแกง', 'ก๋วยเตี๋ยว', 'ข้าวผัด', 'อาหารญี่ปุ่น', 'ส้มตำ'],
    'ของกิน': ['ขนมปัง', 'น้ำดื่ม', 'กาแฟ', 'ผลไม้', 'ชานมไข่มุก'],
    'เดินทาง': ['BTS', 'MRT', 'วินมอเตอร์ไซค์', 'Grab'],
    'ของใช้ประจำวัน': ['สบู่', 'ยาสีฟัน', 'ผงซักฟอก', 'ทิชชู่'],
    'บันเทิง': ['ดูหนัง', 'เติมเกม', 'หนังสือ']
  };

  let idCounter = 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // 2-4 transactions per day
    const numTrans = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < numTrans; i++) {
      const cat = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      const amount = Math.floor(Math.random() * (cat.max - cat.min + 1)) + cat.min;
      const noteList = notes[cat.name] || ['-'];
      const note = noteList[Math.floor(Math.random() * noteList.length)];

      data.push({
        id: idCounter++,
        type: 'expense',
        amount: amount,
        category: cat.name,
        date: dateStr,
        note: note
      });
    }

    // Occasional special expenses
    if (day % 7 === 0) {
      data.push({
        id: idCounter++,
        type: 'expense',
        amount: 1500,
        category: 'บันเทิง',
        date: dateStr,
        note: 'สังสรรค์วันหยุด'
      });
    }
    
    if (day === 10 || day === 25) {
      data.push({
        id: idCounter++,
        type: 'expense',
        amount: 2000,
        category: 'ที่พัก',
        date: dateStr,
        note: 'ค่าน้ำค่าไฟ'
      });
    }
  }

  return data;
};

export const initialDemoData = generateMockData();
