// API endpoint'leri
const API_URL = 'http://localhost:3000/api';

// Global değişkenler
let currentStartups = [];
let selectedStartupId = null;
let founders = [];

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    await loadFounders();
    await loadStartups();
});

// Startup'ları yükle
async function loadStartups() {
    try {
        const response = await fetch(`${API_URL}/startups`);
        if (!response.ok) throw new Error('Startup\'lar yüklenirken bir hata oluştu');
        currentStartups = await response.json();
        displayStartups(currentStartups);
    } catch (error) {
        console.error('Startup\'lar yüklenirken hata:', error);
        showAlert('Startup\'lar yüklenirken hata oluştu', 'danger');
    }
}

// Kurucuları yükle
async function loadFounders() {
    try {
        const response = await fetch(`${API_URL}/contacts`);
        if (!response.ok) throw new Error('Kurucular yüklenirken bir hata oluştu');
        const contacts = await response.json();
        
        // Girişimci rolüne sahip kişileri filtrele (primary_role veya additional_roles içinde)
        founders = contacts.filter(contact => {
            const allRoles = [contact.primary_role, ...(contact.additional_roles || [])];
            return allRoles.includes('Girişimci');
        });
        
        if (founders.length === 0) {
            showAlert('Henüz hiç Girişimci rolüne sahip kişi bulunmuyor', 'warning');
        }
    } catch (error) {
        console.error('Kurucular yüklenirken hata:', error);
        showAlert('Kurucular yüklenirken hata oluştu', 'danger');
    }
}

// Startup'ları görüntüle
function displayStartups(startups) {
    const startupsList = document.getElementById('startupsList');
    startupsList.innerHTML = '';
    
    startups.forEach(startup => {
        const founderNames = startup.founders ? 
            startup.founders.map(founder => `${founder.name} (${founder.title})`).join(', ') : '';
        
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="startup-card">
                <img src="${startup.logo_url || 'https://via.placeholder.com/300'}" 
                     alt="${startup.name}" 
                     class="startup-logo">
                <div class="startup-info">
                    <div class="startup-name">${startup.name}</div>
                    <div class="startup-founders">Kurucular: ${founderNames}</div>
                    <div class="startup-usecase">${startup.use_case || ''}</div>
                </div>
                <div class="startup-actions">
                    <div>
                        ${startup.website_url ? 
                            `<a href="${startup.website_url}" target="_blank" class="website-btn me-2">
                                <i class="fas fa-globe"></i>
                            </a>` : 
                            ''}
                        ${startup.linkedin_url ? 
                            `<a href="${startup.linkedin_url}" target="_blank" class="linkedin-btn me-2">
                                <i class="fab fa-linkedin"></i>
                            </a>` : 
                            ''}
                        <button onclick="showEditStartupModal(${startup.id})" class="edit-btn me-2">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                    <button onclick="showDeleteStartupModal(${startup.id})" class="delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        startupsList.appendChild(card);
    });
}

// Form verilerini topla
function getFormData(isEdit = false) {
    const prefix = isEdit ? 'edit_' : '';
    
    // Kurucuları topla
    const founderItems = document.querySelectorAll(`#${prefix}foundersList .founder-item`);
    const foundersList = Array.from(founderItems).map(item => {
        const select = item.querySelector('.founder-select');
        const title = item.querySelector('.founder-title');
        return {
            id: parseInt(select.value),
            title: title.value.trim()
        };
    }).filter(f => f.id && f.title); // Boş değerleri filtrele
    
    return {
        name: document.getElementById(`${prefix}name`).value.trim(),
        website_url: document.getElementById(`${prefix}website_url`).value.trim() || null,
        linkedin_url: document.getElementById(`${prefix}linkedin_url`).value.trim() || null,
        logo_url: document.getElementById(`${prefix}logo_url`).value.trim() || null,
        use_case: document.getElementById(`${prefix}use_case`).value.trim(),
        founders: foundersList
    };
}

// Yeni startup ekle
async function submitAddStartupForm() {
    const form = document.getElementById('addStartupForm');
    
    // Form validasyonu
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = getFormData();
    
    try {
        const response = await fetch(`${API_URL}/startups`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Startup eklenirken bir hata oluştu');
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addStartupModal'));
        modal.hide();
        form.reset();
        document.getElementById('foundersList').innerHTML = '';
        await loadStartups();
        showAlert('Startup başarıyla eklendi', 'success');
    } catch (error) {
        console.error('Startup eklenirken hata:', error);
        showAlert(error.message || 'Startup eklenirken hata oluştu', 'danger');
    }
}

// Düzenleme modalını göster
async function showEditStartupModal(startupId) {
    try {
        const response = await fetch(`${API_URL}/startups/${startupId}`);
        if (!response.ok) throw new Error('Startup bilgileri alınamadı');
        const startup = await response.json();
        
        // Form alanlarını doldur
        document.getElementById('edit_startup_id').value = startup.id;
        document.getElementById('edit_name').value = startup.name;
        document.getElementById('edit_website_url').value = startup.website_url || '';
        document.getElementById('edit_linkedin_url').value = startup.linkedin_url || '';
        document.getElementById('edit_logo_url').value = startup.logo_url || '';
        document.getElementById('edit_use_case').value = startup.use_case || '';
        
        // Kurucuları doldur
        const foundersList = document.getElementById('edit_foundersList');
        foundersList.innerHTML = '';
        
        if (startup.founders && startup.founders.length > 0) {
            startup.founders.forEach(founder => {
                const founderId = Date.now() + Math.random();
                const founderDiv = document.createElement('div');
                founderDiv.className = 'founder-item mb-3 p-3 border rounded';
                founderDiv.dataset.id = founderId;
                
                // Mevcut kurucuyu seç ve unvanını göster
                founderDiv.innerHTML = `
                    <div class="row">
                        <div class="col-md-5">
                            <select class="form-select founder-select" required>
                                <option value="">Kurucu seçin</option>
                                ${founders.map(f => `
                                    <option value="${f.id}" ${f.id === founder.id ? 'selected' : ''}>
                                        ${f.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="col-md-5">
                            <input type="text" class="form-control founder-title" 
                                   value="${founder.title || ''}" 
                                   placeholder="Unvan (örn: CEO, CTO)" required>
                        </div>
                        <div class="col-md-2">
                            <button type="button" class="btn btn-danger" onclick="removeFounder(${founderId})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;

                foundersList.appendChild(founderDiv);
            });
        }
        
        // Modalı göster
        const editModal = new bootstrap.Modal(document.getElementById('editStartupModal'));
        editModal.show();
    } catch (error) {
        console.error('Startup bilgileri alınırken hata:', error);
        showAlert('Startup bilgileri alınamadı', 'danger');
    }
}

// Startup'ı güncelle
async function submitEditStartupForm() {
    const form = document.getElementById('editStartupForm');
    
    // Form validasyonu
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const startupId = document.getElementById('edit_startup_id').value;
    const formData = getFormData(true);
    
    try {
        const response = await fetch(`${API_URL}/startups/${startupId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Startup güncellenirken bir hata oluştu');
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('editStartupModal'));
        modal.hide();
        form.reset();
        document.getElementById('edit_foundersList').innerHTML = '';
        await loadStartups();
        showAlert('Startup başarıyla güncellendi', 'success');
    } catch (error) {
        console.error('Startup güncellenirken hata:', error);
        showAlert(error.message || 'Startup güncellenirken hata oluştu', 'danger');
    }
}

// Silme modalını göster
function showDeleteStartupModal(startupId) {
    selectedStartupId = startupId;
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteStartupModal'));
    deleteModal.show();
}

// Startup'ı sil
async function confirmDeleteStartup() {
    if (!selectedStartupId) return;
    
    try {
        const response = await fetch(`${API_URL}/startups/${selectedStartupId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Startup silinirken bir hata oluştu');
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteStartupModal'));
        modal.hide();
        await loadStartups();
        showAlert('Startup başarıyla silindi', 'success');
    } catch (error) {
        console.error('Startup silinirken hata:', error);
        showAlert('Startup silinirken hata oluştu', 'danger');
    }
}

// Alert göster
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Kurucu ekle
function addFounder(prefix = '') {
    const founderId = Date.now();
    const foundersListId = `${prefix}foundersList`;
    const foundersList = document.getElementById(foundersListId);
    
    if (!foundersList) {
        console.error(`${foundersListId} elementi bulunamadı`);
        showAlert('Kurucu eklenirken bir hata oluştu', 'danger');
        return;
    }

    if (!founders || founders.length === 0) {
        showAlert('Eklenebilecek girişimci bulunamadı. Önce girişimci rolüne sahip contact ekleyin.', 'warning');
        return;
    }
    
    const founderDiv = document.createElement('div');
    founderDiv.className = 'founder-item mb-3 p-3 border rounded';
    founderDiv.dataset.id = founderId;
    
    // Kurucu seçim alanını oluştur
    founderDiv.innerHTML = `
        <div class="row">
            <div class="col-md-5">
                <select class="form-select founder-select" required>
                    <option value="">Kurucu seçin</option>
                    ${founders.map(founder => `
                        <option value="${founder.id}">${founder.name}</option>
                    `).join('')}
                </select>
            </div>
            <div class="col-md-5">
                <input type="text" class="form-control founder-title" 
                       placeholder="Unvan (örn: CEO, CTO)" required>
            </div>
            <div class="col-md-2">
                <button type="button" class="btn btn-danger" onclick="removeFounder('${founderId}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    foundersList.appendChild(founderDiv);
}

// Kurucu sil
function removeFounder(founderId) {
    const founderElement = document.querySelector(`[data-id="${founderId}"]`);
    if (founderElement) {
        founderElement.remove();
    }
} 