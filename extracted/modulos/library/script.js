// Library Module Script

const libraryHtml = `
<div id="library-content-wrapper">
    <div class="view-header">
        <h2 class="view-title">Biblioteca de <span class="highlight">Documentos</span></h2>
        <button class="cta-button" onclick="openDocumentModal()" data-i18n="library.upload_document">📤 Subir Documento</button>
    </div>
    <div class="toolbar">
        <input type="text" id="document-search" placeholder="Buscar por nombre o descripción..." style="flex-grow: 2;">
        <select id="document-filter-category" data-custom-select>
            <option value="">Todas las Categorías</option>
            <option value="Licencia">Licencia</option>
            <option value="Certificado">Certificado</option>
            <option value="Permiso">Permiso</option>
            <option value="Seguro">Seguro</option>
            <option value="Contrato">Contrato</option>
            <option value="Otros">Otros</option>
        </select>
        <select id="document-filter-expiration" data-custom-select>
            <option value="">Todos</option>
            <option value="expired">Vencidos</option>
            <option value="expiring_soon">Por Vencer (30 días)</option>
            <option value="valid">Vigentes</option>
        </select>
    </div>
    <div class="documents-grid" id="documents-grid">
        <!-- El contenido se generará con JS -->
    </div>
</div>

<!-- Modal para previsualizar documentos -->
<div id="document-preview-modal" class="modal no-print">
    <div class="modal-content" style="max-width: 90%; max-height: 90vh;">
        <span class="modal-close" onclick="closeModal('document-preview-modal')">×</span>
        <h2 id="document-preview-title">Vista Previa del Documento</h2>
        <div id="document-preview-content" style="margin-top: 20px; min-height: 400px; display: flex; align-items: center; justify-content: center; background-color: var(--bg-dark); border-radius: 8px; padding: 20px;">
            <div style="text-align: center; color: var(--text-medium);">Cargando...</div>
        </div>
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
            <button class="action-btn" onclick="closeModal('document-preview-modal')">Cerrar</button>
            <button class="cta-button" id="document-preview-download-btn" onclick="">📥 Descargar</button>
        </div>
    </div>
</div>

<!-- Modal para subir documentos -->
<div id="document-modal" class="modal no-print">
    <div class="modal-content">
        <span class="modal-close" onclick="closeModal('document-modal')">×</span>
        <h2 id="document-modal-title">Subir Nuevo Documento</h2>
        <form id="document-form" enctype="multipart/form-data">
            <input type="hidden" id="document-id">
            <div class="form-grid">
                <div class="form-group">
                    <label for="document-name">Nombre del Documento *</label>
                    <input type="text" id="document-name" required placeholder="Ej: Licencia de Fumigación 2025">
                </div>
                <div class="form-group">
                    <label for="document-category">Categoría *</label>
                    <select id="document-category" required data-custom-select>
                        <option value="Licencia">Licencia</option>
                        <option value="Certificado">Certificado</option>
                        <option value="Permiso">Permiso</option>
                        <option value="Seguro">Seguro</option>
                        <option value="Contrato">Contrato</option>
                        <option value="Otros">Otros</option>
                    </select>
                </div>
            </div>
            <div class="form-group full-width">
                <label for="document-description">Descripción</label>
                <textarea id="document-description" rows="3" placeholder="Descripción opcional del documento..."></textarea>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label for="document-expiration-date">Fecha de Vencimiento (Opcional)</label>
                    <input type="date" id="document-expiration-date">
                </div>
                <div class="form-group">
                    <label for="document-file">Archivo *</label>
                    <div class="file-upload-area">
                        <input type="file" id="document-file" required accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx" style="display: none;" onchange="handleDocumentFileSelect(event)">
                        <div class="file-upload-button" onclick="document.getElementById('document-file').click()">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7,10 12,15 17,10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            <span>Seleccionar archivo</span>
                        </div>
                        <div class="file-upload-info">
                            <small>Formatos permitidos: PDF, imágenes (JPG, PNG, GIF), Word, Excel (máx. 10MB)</small>
                        </div>
                        <div id="document-file-preview"></div>
                        <div id="document-file-name" style="margin-top: 10px; color: var(--text-medium);">Ningún archivo seleccionado</div>
                    </div>
                </div>
            </div>
            <button type="submit" class="cta-button" style="width:100%; margin-top: 20px;">📤 Subir Documento</button>
        </form>
    </div>
</div>
`;

// Helper local


async function loadLibraryView() {
    const container = document.getElementById('library-view');
    if (!container) return;
    
    // Check if content is already loaded (look for unique element)
    if (container.querySelector('#documents-grid')) return;

    try {
        // Create temp container to parse HTML
        const temp = document.createElement('div');
        temp.innerHTML = libraryHtml;
        
        // Extract modals and append to body
        const previewModal = temp.querySelector('#document-preview-modal');
        const uploadModal = temp.querySelector('#document-modal');
        
        if (previewModal) {
            if (!document.getElementById('document-preview-modal')) {
                document.body.appendChild(previewModal);
            } else {
                previewModal.remove();
            }
        }
        
        if (uploadModal) {
            if (!document.getElementById('document-modal')) {
                document.body.appendChild(uploadModal);
                // Initialize custom selects for this modal
                if (window.createCustomSelect) {
                    uploadModal.querySelectorAll('[data-custom-select]').forEach(window.createCustomSelect);
                }
            } else {
                uploadModal.remove();
            }
        }
        
        // Put the rest into container
        const content = temp.querySelector('#library-content-wrapper');
        if (content) {
            container.innerHTML = content.innerHTML;
            
            // Initialize custom selects for the view
            if (window.createCustomSelect) {
                container.querySelectorAll('[data-custom-select]').forEach(window.createCustomSelect);
            }
            
            // Setup filters listeners
            setupDocumentFilters();
        }
        
        // Setup form listener
        const form = document.getElementById('document-form');
        if (form) {
            form.addEventListener('submit', handleDocumentFormSubmit);
        }

    } catch (e) {
        console.error('Error loading library view', e);
    }
}

async function renderDocumentLibrary() {
    await loadLibraryView();

    const container = getEl('documents-grid');
    if (!container) return; // Should be loaded now
    
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-medium);">Cargando documentos...</div>';
    
    try {
        const result = await apiCall(`get_documents.php?company_id=${AppState.currentUser.companyId}`);
        
        if (!result.success) {
            container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--error-color);">Error al cargar documentos: ${result.message || 'Error desconocido'}</div>`;
            return;
        }
        
        const documents = result.documents || [];
        
        // Aplicar filtros
        let filteredDocs = documents;
        
        // Filtro de búsqueda
        const searchTerm = (getEl('document-search')?.value || '').toLowerCase();
        if (searchTerm) {
            filteredDocs = filteredDocs.filter(doc => 
                doc.name.toLowerCase().includes(searchTerm) || 
                (doc.description && doc.description.toLowerCase().includes(searchTerm))
            );
        }
        
        // Filtro de categoría
        const categoryFilter = getEl('document-filter-category')?.value || '';
        if (categoryFilter) {
            filteredDocs = filteredDocs.filter(doc => doc.category === categoryFilter);
        }
        
        // Filtro de expiración
        const expirationFilter = getEl('document-filter-expiration')?.value || '';
        if (expirationFilter) {
            if (expirationFilter === 'expired') {
                filteredDocs = filteredDocs.filter(doc => doc.is_expired === true);
            } else if (expirationFilter === 'expiring_soon') {
                filteredDocs = filteredDocs.filter(doc => 
                    doc.expiration_date && 
                    !doc.is_expired && 
                    doc.days_until_expiration !== null && 
                    doc.days_until_expiration <= 30
                );
            } else if (expirationFilter === 'valid') {
                filteredDocs = filteredDocs.filter(doc => !doc.is_expired);
            }
        }
        
        if (filteredDocs.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-medium);">No se encontraron documentos. Haz clic en "Subir Documento" para agregar uno.</div>';
            return;
        }
        
        container.innerHTML = filteredDocs.map(doc => {
            const fileIcon = getFileIcon(doc.file_type);
            const fileSize = formatFileSize(doc.file_size);
            const uploadDate = formatDate(doc.uploaded_at);
            const expirationBadge = doc.expiration_date ? 
                (doc.is_expired ? 
                    `<span class="document-badge expired">⚠️ Vencido</span>` : 
                    (doc.days_until_expiration <= 30 ? 
                        `<span class="document-badge expiring">⏰ Vence en ${doc.days_until_expiration} días</span>` :
                        `<span class="document-badge valid">✓ Válido hasta ${formatDate(doc.expiration_date)}</span>`
                    )
                ) : '';
            
            return `
                <div class="document-card">
                    <div class="document-card-header">
                        <span class="document-icon">${fileIcon}</span>
                        <div class="document-title-section">
                            <h3 class="document-title">${escapeHtml(doc.name)}</h3>
                            <span class="document-category">${escapeHtml(doc.category)}</span>
                        </div>
                        ${expirationBadge}
                    </div>
                    <div class="document-card-body">
                        ${doc.description ? `<p class="document-description">${escapeHtml(doc.description)}</p>` : ''}
                        <div class="document-info">
                            <div class="document-info-item">
                                <strong>Archivo:</strong> ${escapeHtml(doc.file_name)}
                            </div>
                            <div class="document-info-item">
                                <strong>Tamaño:</strong> ${fileSize}
                            </div>
                            <div class="document-info-item">
                                <strong>Subido:</strong> ${uploadDate}
                            </div>
                            ${doc.expiration_date ? `
                            <div class="document-info-item">
                                <strong>Vencimiento:</strong> ${formatDate(doc.expiration_date)}
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="document-card-actions">
                        <button class="action-btn info" onclick="previewDocument(${doc.id}, '${escapeHtml(doc.file_path)}', '${escapeHtml(doc.file_type)}', '${escapeHtml(doc.file_name)}')">👁️ Ver</button>
                        <button class="action-btn info" onclick="downloadDocument(${doc.id})">📥 Descargar</button>
                        ${checkPermissions(true) ? `<button class="action-btn delete" onclick="deleteDocument(${doc.id})">🗑️ Eliminar</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Re-setup filters (listeners are lost when innerHTML is replaced? No, they are on inputs, not container)
        // But if elements were re-created (loadLibraryView logic checks for existing), it's fine.
        // renderDocumentLibrary is called on filter change too.
        
    } catch (error) {
        console.error('Error al cargar documentos:', error);
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--error-color);">Error al cargar documentos. Por favor, recarga la página.</div>`;
    }
}

function getFileIcon(fileType) {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    return '📎';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function setupDocumentFilters() {
    const searchInput = getEl('document-search');
    const categoryFilter = getEl('document-filter-category');
    const expirationFilter = getEl('document-filter-expiration');
    
    // Remove old listeners to avoid duplicates if any (though standard addEventListener allows duplicates if not careful, but here we usually just add once on load. If renderDocumentLibrary is called multiple times, we might add multiple listeners if we are not careful. But setupDocumentFilters is called inside renderDocumentLibrary... wait.)
    // In original code: setupDocumentFilters was called inside renderDocumentLibrary.
    // And it adds listeners that call renderDocumentLibrary.
    // If renderDocumentLibrary calls setupDocumentFilters, which adds listeners...
    // We should ensure we don't add infinite listeners.
    // Ideally, setupDocumentFilters should only be called once when view loads.
    
    // In my loadLibraryView, I call setupDocumentFilters ONCE when content is injected.
    // In renderDocumentLibrary, the original code called it at the end. 
    // I will remove the call from renderDocumentLibrary and rely on loadLibraryView calling it.
    
    if (searchInput) {
        searchInput.oninput = () => renderDocumentLibrary();
    }
    if (categoryFilter) {
        categoryFilter.onchange = () => renderDocumentLibrary();
    }
    if (expirationFilter) {
        expirationFilter.onchange = () => renderDocumentLibrary();
    }
}

async function handleDocumentFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const fileInput = getEl('document-file');
    
    if (!fileInput.files[0]) {
        showAlert('Por favor, selecciona un archivo', 'Error');
        return;
    }
    
    formData.append('file', fileInput.files[0]);
    formData.append('company_id', AppState.currentUser.companyId);
    formData.append('name', getEl('document-name').value);
    formData.append('description', getEl('document-description').value);
    formData.append('category', getEl('document-category').value);
    formData.append('expiration_date', getEl('document-expiration-date').value || '');
    formData.append('uploaded_by', AppState.currentUser.id || '');
    
    try {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Subiendo...';
        
        const response = await fetch('api/upload_document.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        
        if (result.success) {
            showAlert('Documento subido correctamente', 'Éxito');
            closeModal('document-modal');
            await renderDocumentLibrary();
        } else {
            showAlert(result.message || 'Error al subir el documento', 'Error');
        }
    } catch (error) {
        console.error('Error al subir documento:', error);
        showAlert('Error al subir el documento. Por favor, intenta de nuevo.', 'Error');
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if(submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '📤 Subir Documento';
        }
    }
}

// Global functions exposed to window

window.previewDocument = async function(documentId, filePath, fileType, fileName) {
    const modal = getEl('document-preview-modal');
    const content = getEl('document-preview-content');
    const title = getEl('document-preview-title');
    const downloadBtn = getEl('document-preview-download-btn');
    
    title.textContent = `Vista Previa: ${fileName}`;
    content.innerHTML = '<div style="text-align: center; color: var(--text-medium);">Cargando...</div>';
    
    // Configurar botón de descarga
    downloadBtn.onclick = () => downloadDocument(documentId);
    
    openModal('document-preview-modal');
    
    // Construir URL del archivo
    const fileUrl = `api/${filePath}`;
    
    // Mostrar preview según el tipo de archivo
    if (fileType.startsWith('image/')) {
        content.innerHTML = `
            <img src="${fileUrl}" style="max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 8px;" alt="${escapeHtml(fileName)}" onerror="this.parentElement.innerHTML='<div style=\'text-align: center; color: var(--error-color); padding: 40px;\'>Error al cargar la imagen. <br><button class=\'cta-button\' onclick=\'downloadDocument(${documentId})\'>Descargar archivo</button></div>'">
        `;
    } else if (fileType === 'application/pdf') {
        content.innerHTML = `
            <iframe src="${fileUrl}#toolbar=1" style="width: 100%; height: 70vh; border: 1px solid var(--border-color); border-radius: 8px;" onerror="this.parentElement.innerHTML='<div style=\'text-align: center; color: var(--error-color); padding: 40px;\'>Error al cargar el PDF. <br><button class=\'cta-button\' onclick=\'downloadDocument(${documentId})\'>Descargar archivo</button></div>'"></iframe>
        `;
    } else if (fileType.includes('word') || fileType.includes('document')) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">📝</div>
                <h3 style="color: var(--text-light); margin-bottom: 10px;">Documento Word</h3>
                <p style="color: var(--text-medium); margin-bottom: 30px;">Los documentos de Word no se pueden previsualizar en el navegador.</p>
                <button class="cta-button" onclick="downloadDocument(${documentId})">📥 Descargar Documento</button>
            </div>
        `;
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">📊</div>
                <h3 style="color: var(--text-light); margin-bottom: 10px;">Hoja de Cálculo Excel</h3>
                <p style="color: var(--text-medium); margin-bottom: 30px;">Las hojas de cálculo de Excel no se pueden previsualizar en el navegador.</p>
                <button class="cta-button" onclick="downloadDocument(${documentId})">📥 Descargar Archivo</button>
            </div>
        `;
    } else {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">📎</div>
                <h3 style="color: var(--text-light); margin-bottom: 10px;">${escapeHtml(fileName)}</h3>
                <p style="color: var(--text-medium); margin-bottom: 30px;">Este tipo de archivo no se puede previsualizar en el navegador.</p>
                <button class="cta-button" onclick="downloadDocument(${documentId})">📥 Descargar Archivo</button>
            </div>
        `;
    }
};

window.downloadDocument = function(documentId) {
    const url = `api/download_document.php?id=${documentId}&company_id=${AppState.currentUser.companyId}`;
    window.open(url, '_blank');
};

window.deleteDocument = async function(documentId) {
    if (!checkPermissions(true)) return;
    
    showConfirm('¿Seguro que quieres eliminar este documento? Esta acción no se puede deshacer.', 'Confirmar Eliminación', async (confirmed) => {
        if (confirmed) {
            try {
                const result = await apiCall(`delete_document.php?id=${documentId}&company_id=${AppState.currentUser.companyId}`, { method: 'GET' });
                if (result.success) {
                    showAlert('Documento eliminado correctamente', 'Éxito');
                    await renderDocumentLibrary();
                } else {
                    showAlert(result.message || 'No se pudo eliminar el documento.', 'Error');
                }
            } catch (error) {
                console.error('Error al eliminar documento:', error);
                showAlert('Error al eliminar el documento. Por favor, intenta de nuevo.', 'Error');
            }
        }
    });
};

window.openDocumentModal = function() {
    if (!checkPermissions(true)) return;
    
    getEl('document-form').reset();
    getEl('document-id').value = '';
    getEl('document-file-preview').innerHTML = '';
    getEl('document-file-name').textContent = 'Ningún archivo seleccionado';
    getEl('document-modal-title').textContent = 'Subir Nuevo Documento';
    openModal('document-modal');
};

window.handleDocumentFileSelect = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileNameEl = getEl('document-file-name');
    const previewEl = getEl('document-file-preview');
    
    fileNameEl.textContent = file.name;
    fileNameEl.style.color = 'var(--text-light)';
    
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewEl.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 200px; margin-top: 10px; border-radius: 5px; border: 1px solid var(--border-color);">`;
        };
        reader.readAsDataURL(file);
    } else {
        previewEl.innerHTML = '';
    }
};

window.renderDocumentLibrary = renderDocumentLibrary;
