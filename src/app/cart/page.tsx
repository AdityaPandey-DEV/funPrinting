'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    getCart,
    removeFromCart,
    clearCart,
    getCartWeight,
    estimateItemPrice,
    estimateCartTotal,
    CartItem,
    dataUrlToFile,
} from '@/lib/cartUtils';

export default function CartPage() {
    const router = useRouter();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{
        pageSize: 'A4' | 'A3';
        color: 'color' | 'bw' | 'mixed';
        sided: 'single' | 'double';
        copies: number;
    }>({ pageSize: 'A4', color: 'bw', sided: 'single', copies: 1 });

    useEffect(() => {
        setCartItems(getCart());
    }, []);

    const handleRemove = (id: string) => {
        const updated = removeFromCart(id);
        setCartItems(updated);
    };

    const handleClearAll = () => {
        clearCart();
        setCartItems([]);
    };

    const startEdit = (item: CartItem) => {
        setEditingId(item.id);
        setEditForm({
            pageSize: item.printingOptions.pageSize,
            color: item.printingOptions.color,
            sided: item.printingOptions.sided,
            copies: item.printingOptions.copies,
        });
    };

    const saveEdit = (id: string) => {
        const updatedItems = cartItems.map(item => {
            if (item.id === id) {
                return {
                    ...item,
                    printingOptions: {
                        ...item.printingOptions,
                        pageSize: editForm.pageSize,
                        color: editForm.color,
                        sided: editForm.sided,
                        copies: editForm.copies,
                    },
                };
            }
            return item;
        });

        // Save to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('funprinting_cart', JSON.stringify({
                items: updatedItems,
                updatedAt: Date.now(),
            }));
        }

        setCartItems(updatedItems);
        setEditingId(null);
    };

    const handleCheckout = () => {
        // Navigate to order page — the order page will load cart items from the drawer
        router.push('/order');
    };

    const getFileIcon = (fileName: string) => {
        if (fileName.endsWith('.pdf')) return '📄';
        if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) return '📝';
        if (fileName.match(/\.(jpg|jpeg|png|gif)$/i)) return '🖼️';
        return '📁';
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            {/* Header */}
            <div className="bg-white border-b shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                🛒 Your Cart
                                {cartItems.length > 0 && (
                                    <span className="bg-amber-100 text-amber-800 text-sm font-semibold px-3 py-1 rounded-full">
                                        {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Batch your print orders together for shared delivery costs
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                href="/order"
                                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                + Add More Items
                            </Link>
                            {cartItems.length > 0 && (
                                <button
                                    onClick={handleClearAll}
                                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8">
                {cartItems.length === 0 ? (
                    /* Empty Cart */
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🛒</div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
                        <p className="text-gray-500 mb-6">Add files to your cart to batch multiple print orders together</p>
                        <Link
                            href="/order"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                        >
                            📄 Start Ordering
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Cart Items List */}
                        <div className="lg:col-span-2 space-y-4">
                            {cartItems.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                                >
                                    {/* Item Header */}
                                    <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{getFileIcon(item.fileName)}</span>
                                            <div>
                                                <h3 className="font-semibold text-gray-800">{item.fileName}</h3>
                                                <p className="text-xs text-gray-400">
                                                    {formatFileSize(item.fileSize)} • {item.pageCount} page{item.pageCount !== 1 ? 's' : ''} • Added {new Date(item.addedAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {editingId !== item.id ? (
                                                <>
                                                    <button
                                                        onClick={() => startEdit(item)}
                                                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemove(item.id)}
                                                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                                    >
                                                        🗑️ Remove
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => saveEdit(item.id)}
                                                        className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                                                    >
                                                        ✅ Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Item Details / Edit Form */}
                                    <div className="px-6 py-4">
                                        {editingId === item.id ? (
                                            /* Edit Mode */
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Page Size</label>
                                                    <select
                                                        value={editForm.pageSize}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, pageSize: e.target.value as 'A4' | 'A3' }))}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                                                    >
                                                        <option value="A4">A4</option>
                                                        <option value="A3">A3</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Color Mode</label>
                                                    <select
                                                        value={editForm.color}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value as 'color' | 'bw' | 'mixed' }))}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                                                    >
                                                        <option value="bw">B&W</option>
                                                        <option value="color">Color</option>
                                                        <option value="mixed">Mixed</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Print Side</label>
                                                    <select
                                                        value={editForm.sided}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, sided: e.target.value as 'single' | 'double' }))}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                                                    >
                                                        <option value="single">Single Sided</option>
                                                        <option value="double">Double Sided</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Copies</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="100"
                                                        value={editForm.copies}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, copies: Math.max(1, parseInt(e.target.value) || 1) }))}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            /* View Mode */
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-wrap gap-3">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                                                        📐 {item.printingOptions.pageSize}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                                                        {item.printingOptions.color === 'color' ? '🎨 Color' :
                                                            item.printingOptions.color === 'mixed' ? '🎨 Mixed' : '⬛ B&W'}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                                                        {item.printingOptions.sided === 'double' ? '↔️ Double Sided' : '→ Single Sided'}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                                                        📋 {item.printingOptions.copies} {item.printingOptions.copies > 1 ? 'copies' : 'copy'}
                                                    </span>
                                                </div>
                                                <div className="text-right ml-4">
                                                    <p className="text-lg font-bold text-gray-800">~₹{estimateItemPrice(item)}</p>
                                                    <p className="text-[10px] text-gray-400">estimated</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Order Summary Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-24">
                                <h3 className="font-bold text-gray-800 text-lg mb-4">Order Summary</h3>

                                {/* Items Breakdown */}
                                <div className="space-y-2 mb-4">
                                    {cartItems.map((item, idx) => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <span className="text-gray-600 truncate mr-2 max-w-[60%]">{item.fileName}</span>
                                            <span className="font-medium text-gray-800">~₹{estimateItemPrice(item)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t pt-3 mb-3">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600">Subtotal</span>
                                        <span className="font-semibold text-gray-800">~₹{estimateCartTotal()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600">Delivery</span>
                                        <span className="text-gray-500 text-xs">at checkout</span>
                                    </div>
                                </div>

                                <div className="border-t pt-3 mb-4">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-gray-800">Est. Total</span>
                                        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                            ~₹{estimateCartTotal()}
                                        </span>
                                    </div>
                                </div>

                                {/* Delivery Savings */}
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                    <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                                        💰 Saving on delivery!
                                    </p>
                                    <p className="text-xs text-green-600 mt-1">
                                        Combined weight: {(getCartWeight() * 1000).toFixed(0)}g — one delivery charge for all {cartItems.length} items
                                    </p>
                                </div>

                                {/* Checkout Button */}
                                <button
                                    onClick={handleCheckout}
                                    className="w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                                >
                                    🛍️ Proceed to Checkout
                                </button>

                                <p className="text-[10px] text-gray-400 text-center mt-3">
                                    You'll choose delivery options & pay on the next page
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
