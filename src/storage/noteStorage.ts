// src/storage/noteStorage.ts
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { GhiChu } from '../types';

const COLLECTION_NAME = 'notes';

export const layDanhSach = async (): Promise<GhiChu[]> => {
  try {
    
    const q = query(collection(db, COLLECTION_NAME), orderBy('ngayTao', 'desc'));
    const querySnapshot = await getDocs(q);

    const danhSach: GhiChu[] = [];
    querySnapshot.forEach((doc) => {
      danhSach.push({ id: doc.id, ...doc.data() } as GhiChu);
    });

    return danhSach;
  } catch (loi) {
    console.log('[Firebase] Lỗi lấy danh sách:', loi);
    return [];
  }
};

export const layTheoId = async (id: string): Promise<GhiChu | null> => {
  try {
    // Với Firebase, lấy theo ID rất nhanh
    const danhSach = await layDanhSach(); // Cách đơn giản cho người mới
    return danhSach.find((n) => n.id === id) || null;
  } catch (loi) {
    return null;
  }
};

export const luuGhiChu = async (ghiChu: GhiChu): Promise<void> => {
  try {
    const { id, ...duLieuLuu } = ghiChu;
    duLieuLuu.ngayCapNhat = Date.now();

    const noteRef = doc(db, COLLECTION_NAME, id);

    if (ghiChu.id) {
      const { setDoc } = require('firebase/firestore'); 
      await setDoc(noteRef, duLieuLuu, { merge: true });
    } 
    else {
      await addDoc(collection(db, COLLECTION_NAME), duLieuLuu);
    }
  } catch (loi) {
    console.log('[Firebase] Lỗi lưu ghi chú:', loi);
    throw loi;
  }
};

export const xoaGhiChu = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (loi) {
    console.log('[Firebase] Lỗi xóa ghi chú:', loi);
    throw loi;
  }
};