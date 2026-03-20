import { useState, useRef, useCallback } from 'react';
import { Upload, Camera, X, Plus, Trash2, ChevronRight, Loader2, RotateCcw, Check, ImageIcon } from 'lucide-react';
import { processBatchImages, validateMenuItems } from '../services/ocrApi';
import { createRestaurant } from '../data/models';
import { saveRestaurant } from '../data/firestore';
import CameraModal from './CameraModal';

const CATEGORIES = ['VEG', 'NON_VEG', 'UNKNOWN'];

export default function MenuUploader({ currentUser, onRestaurantCreated, onCancel }) {
    // Step management: 'info' | 'upload' | 'processing' | 'review' | 'saving'
    const [step, setStep] = useState('info');

    // Restaurant info
    const [restaurantInfo, setRestaurantInfo] = useState({
        name: '',
        address: '',
        phone: '',
        cuisine: '',
    });

    // Multiple images support
    const [selectedImages, setSelectedImages] = useState([]); // Array of { file, previewUrl, id }
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [ocrError, setOcrError] = useState(null);
    const [rawOcrText, setRawOcrText] = useState('');

    // Extracted menu items
    const [menuItems, setMenuItems] = useState([]);
    const [saving, setSaving] = useState(false);

    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    // Camera modal state
    const [showCamera, setShowCamera] = useState(false);

    const handleRestaurantInfoChange = (field, value) => {
        setRestaurantInfo(prev => ({ ...prev, [field]: value }));
    };

    const validateAndAddImage = (file) => {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            alert('Please select a valid image file (JPEG, PNG, or WebP)');
            return false;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return false;
        }

        return true;
    };

    const addImage = (file) => {
        if (!validateAndAddImage(file)) return;

        const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const previewUrl = URL.createObjectURL(file);

        setSelectedImages(prev => [...prev, { file, previewUrl, id }]);
    };

    const handleFileSelect = useCallback((event) => {
        const files = Array.from(event.target.files || []);
        files.forEach(file => addImage(file));
        // Reset input so same file can be selected again
        event.target.value = '';
    }, []);

    const handleCameraCapture = useCallback((event) => {
        const files = Array.from(event.target.files || []);
        files.forEach(file => addImage(file));
        // Reset input so same file can be selected again
        event.target.value = '';
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files || []);
        files.forEach(file => addImage(file));
    }, []);

    const removeImage = (id) => {
        setSelectedImages(prev => {
            const image = prev.find(img => img.id === id);
            if (image) {
                URL.revokeObjectURL(image.previewUrl);
            }
            return prev.filter(img => img.id !== id);
        });
    };

    const clearAllImages = () => {
        selectedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
        setSelectedImages([]);
        setMenuItems([]);
        setRawOcrText('');
    };

    const processOCR = async () => {
        if (selectedImages.length === 0) return;

        setStep('processing');
        setOcrProgress(0);
        setOcrError(null);

        try {
            // Process all images in a single batch request
            const files = selectedImages.map(img => img.file);

            const result = await processBatchImages(files, (progress) => {
                setOcrProgress(progress);
            });

            setRawOcrText(result.rawText);

            const validatedItems = validateMenuItems(result.items);
            setMenuItems(validatedItems.map((item, idx) => ({ ...item, id: `temp-${idx}` })));
            setOcrProgress(100);
            setStep('review');
        } catch (error) {
            console.error('OCR processing error:', error);
            setOcrError(error.message || 'Failed to process images. Make sure the OCR API is running (python api/app.py)');
            setStep('upload');
        }
    };

    const addMenuItem = () => {
        const newItem = {
            id: `temp-${Date.now()}`,
            name: '',
            description: '',
            price: '',
            category: 'UNKNOWN',
        };
        setMenuItems(prev => [...prev, newItem]);
    };

    const updateMenuItem = (id, field, value) => {
        setMenuItems(prev =>
            prev.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const removeMenuItem = (id) => {
        setMenuItems(prev => prev.filter(item => item.id !== id));
    };

    const retryOCR = () => {
        processOCR();
    };

    const skipOCR = () => {
        setStep('review');
        setMenuItems([]);
    };

    const saveRestaurantData = async () => {
        if (!restaurantInfo.name.trim()) {
            alert('Please enter a restaurant name');
            return;
        }

        if (menuItems.length === 0) {
            alert('Please add at least one menu item');
            return;
        }

        setSaving(true);

        try {
            // Create restaurant with menu items
            const restaurant = createRestaurant({
                name: restaurantInfo.name.trim(),
                address: restaurantInfo.address.trim(),
                phone: restaurantInfo.phone.trim(),
                cuisine: restaurantInfo.cuisine.trim(),
                createdBy: currentUser.id,
            });

            // Convert temp menu items to proper format with IDs
            const finalMenuItems = menuItems
                .filter(item => item.name.trim())
                .map(item => ({
                    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: item.name.trim(),
                    description: item.description || null,
                    category: item.category || 'UNKNOWN',
                    price: parseFloat(item.price) || 0,
                    createdAt: new Date().toISOString(),
                }));

            restaurant.menuItems = finalMenuItems;

            await saveRestaurant(restaurant);

            onRestaurantCreated?.(restaurant);
        } catch (error) {
            console.error('Error saving restaurant:', error);
            alert('Failed to save restaurant. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const canProceedToUpload = restaurantInfo.name.trim().length > 0;

    // Render steps
    const renderInfoStep = () => (
        <div className="menu-uploader-step">
            <h3>Restaurant Information</h3>
            <p className="step-description">Enter the details of the restaurant</p>

            <div className="form-group">
                <label htmlFor="restaurant-name">Restaurant Name *</label>
                <input
                    id="restaurant-name"
                    type="text"
                    value={restaurantInfo.name}
                    onChange={(e) => handleRestaurantInfoChange('name', e.target.value)}
                    placeholder="e.g., Biryani House"
                    className="form-input"
                />
            </div>

            <div className="form-group">
                <label htmlFor="restaurant-cuisine">Cuisine Type</label>
                <input
                    id="restaurant-cuisine"
                    type="text"
                    value={restaurantInfo.cuisine}
                    onChange={(e) => handleRestaurantInfoChange('cuisine', e.target.value)}
                    placeholder="e.g., Indian, Chinese, Italian"
                    className="form-input"
                />
            </div>

            <div className="form-group">
                <label htmlFor="restaurant-address">Address</label>
                <textarea
                    id="restaurant-address"
                    value={restaurantInfo.address}
                    onChange={(e) => handleRestaurantInfoChange('address', e.target.value)}
                    placeholder="Restaurant address"
                    className="form-input"
                    rows={2}
                />
            </div>

            <div className="form-group">
                <label htmlFor="restaurant-phone">Phone</label>
                <input
                    id="restaurant-phone"
                    type="tel"
                    value={restaurantInfo.phone}
                    onChange={(e) => handleRestaurantInfoChange('phone', e.target.value)}
                    placeholder="e.g., +91 98765 43210"
                    className="form-input"
                />
            </div>

            <div className="step-actions">
                <button className="btn btn-secondary" onClick={onCancel}>
                    Cancel
                </button>
                <button
                    className="btn btn-primary"
                    onClick={() => setStep('upload')}
                    disabled={!canProceedToUpload}
                >
                    Next: Upload Menu <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );

    const renderUploadStep = () => (
        <div className="menu-uploader-step">
            <h3>Upload Menu Photos</h3>
            <p className="step-description">
                Upload or take photos of the menu. Multiple pages are supported.
            </p>

            {selectedImages.length === 0 ? (
                <div className="upload-options">
                    <div
                        className="file-drop-zone"
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload size={48} className="upload-icon" />
                        <p className="upload-text">Click or drag & drop menu images</p>
                        <p className="upload-hint">Supports JPEG, PNG, WebP (max 10MB each)</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/jpg"
                            onChange={handleFileSelect}
                            className="hidden-input"
                            multiple
                        />
                    </div>

                    <div className="upload-divider">
                        <span>OR</span>
                    </div>

                    <button
                        className="camera-capture-btn"
                        onClick={() => setShowCamera(true)}
                    >
                        <Camera size={24} />
                        <span>Take Photo</span>
                        <small>Open camera to capture menu</small>
                    </button>

                </div>
            ) : (
                <div className="images-preview-container">
                    <div className="images-preview-header">
                        <span className="images-count">
                            {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected
                        </span>
                        <button className="btn-clear-all" onClick={clearAllImages}>
                            <Trash2 size={16} /> Clear all
                        </button>
                    </div>

                    <div className="images-grid">
                        {selectedImages.map((image, index) => (
                            <div key={image.id} className="image-thumbnail">
                                <img src={image.previewUrl} alt={`Menu page ${index + 1}`} />
                                <div className="image-overlay">
                                    <span className="image-number">{index + 1}</span>
                                    <button
                                        className="btn-remove-image"
                                        onClick={() => removeImage(image.id)}
                                        title="Remove image"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Add more button */}
                        <div className="image-thumbnail add-more">
                            <button
                                className="add-more-btn"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Plus size={24} />
                                <span>Add More</span>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/jpg"
                                onChange={handleFileSelect}
                                className="hidden-input"
                                multiple
                            />
                        </div>
                    </div>

                    {/* Camera button for adding more */}
                    <button
                        className="camera-add-btn"
                        onClick={() => setShowCamera(true)}
                    >
                        <Camera size={18} />
                        <span>Take another photo</span>
                    </button>
                </div>
            )}

            {ocrError && (
                <div className="error-message">
                    <p>{ocrError}</p>
                </div>
            )}

            <div className="step-actions">
                <button className="btn btn-secondary" onClick={() => setStep('info')}>
                    Back
                </button>
                <div className="action-group">
                    <button
                        className="btn btn-secondary"
                        onClick={skipOCR}
                        disabled={selectedImages.length === 0}
                    >
                        Skip OCR
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={processOCR}
                        disabled={selectedImages.length === 0}
                    >
                        <Camera size={18} /> Extract from {selectedImages.length || 0} Image{selectedImages.length !== 1 ? 's' : ''}
                    </button>
                </div>
            </div>
        </div>
    );

    const renderProcessingStep = () => (
        <div className="menu-uploader-step processing-step">
            <div className="processing-content">
                <Loader2 size={48} className="spinner" />
                <h3>Processing Menu...</h3>
                <p>
                    Processing image {currentImageIndex + 1} of {selectedImages.length}
                </p>

                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${ocrProgress}%` }}
                    />
                </div>
                <p className="progress-text">{ocrProgress}% complete</p>
            </div>
        </div>
    );

    const renderReviewStep = () => (
        <div className="menu-uploader-step review-step">
            <h3>Review Menu Items</h3>
            <p className="step-description">
                Review and edit the extracted items from {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''}.
                Add, remove, or modify as needed.
            </p>

            {menuItems.length === 0 ? (
                <div className="empty-state">
                    <p>No items detected. You can add them manually.</p>
                </div>
            ) : (
                <div className="menu-items-list">
                    {menuItems.map((item, index) => (
                        <div key={item.id} className="menu-item-row">
                            <div className="item-number">{index + 1}</div>

                            <div className="item-fields">
                                <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => updateMenuItem(item.id, 'name', e.target.value)}
                                    placeholder="Dish name"
                                    className="item-name-input"
                                />

                                <input
                                    type="text"
                                    value={item.description || ''}
                                    onChange={(e) => updateMenuItem(item.id, 'description', e.target.value)}
                                    placeholder="Description (optional)"
                                    className="item-desc-input"
                                />

                                <div className="item-row-bottom">
                                    <select
                                        value={item.category}
                                        onChange={(e) => updateMenuItem(item.id, 'category', e.target.value)}
                                        className="item-category-select"
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>

                                    <input
                                        type="number"
                                        value={item.price}
                                        onChange={(e) => updateMenuItem(item.id, 'price', e.target.value)}
                                        placeholder="Price (₹)"
                                        className="item-price-input"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <button
                                className="btn btn-icon btn-remove-item"
                                onClick={() => removeMenuItem(item.id)}
                                title="Remove item"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <button className="btn btn-add-item" onClick={addMenuItem}>
                <Plus size={18} /> Add Menu Item
            </button>

            {rawOcrText && (
                <details className="raw-text-details">
                    <summary>View raw extracted text</summary>
                    <pre className="raw-text">{rawOcrText}</pre>
                </details>
            )}

            <div className="step-actions">
                <button className="btn btn-secondary" onClick={() => setStep('upload')}>
                    Back
                </button>
                <div className="action-group">
                    <button className="btn btn-secondary" onClick={retryOCR}>
                        <RotateCcw size={16} /> Retry OCR
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={saveRestaurantData}
                        disabled={saving || menuItems.filter(i => i.name.trim()).length === 0}
                    >
                        {saving ? (
                            <><Loader2 size={18} className="spinner" /> Saving...</>
                        ) : (
                            <><Check size={18} /> Save Restaurant</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="menu-uploader">
            <div className="uploader-header">
                <h2>Create Restaurant</h2>
                <button className="btn btn-icon" onClick={onCancel}>
                    <X size={20} />
                </button>
            </div>

            <div className="step-indicator">
                {['info', 'upload', 'review'].map((s, idx) => (
                    <div
                        key={s}
                        className={`step-dot ${step === s ? 'active' : ''} ${
                            ['upload', 'review'].includes(step) && s === 'info' ? 'completed' : ''
                        } ${step === 'review' && s === 'upload' ? 'completed' : ''}`}
                    >
                        {idx + 1}
                    </div>
                ))}
            </div>

            {step === 'info' && renderInfoStep()}
            {step === 'upload' && renderUploadStep()}
            {step === 'processing' && renderProcessingStep()}
            {step === 'review' && renderReviewStep()}

            {/* Camera Modal */}
            {showCamera && (
                <CameraModal
                    onCapture={(file) => {
                        addImage(file);
                        setShowCamera(false);
                    }}
                    onClose={() => setShowCamera(false)}
                />
            )}
        </div>
    );
}
