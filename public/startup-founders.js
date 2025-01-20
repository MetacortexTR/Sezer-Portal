// API endpoint'leri
const API_URL = 'http://localhost:3000';

// Global değişkenler
let selectedFounderId = null;
let currentFounders = [];
let currentFilter = 'all';

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    await loadFounders();
    await loadStartupsForSelect();
    await loadContactsForSelect();
    
    // Girişimci rolü ID'sini al ve sakla
    const entrepreneurRoleId = await getEntrepreneurRoleId();
    if (entrepreneurRoleId) {
        window.entrepreneurRoleId = entrepreneurRoleId;
    }

    // Tab click event'lerini ekle
    document.querySelectorAll('.nav-link[data-filter]').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const filter = e.target.dataset.filter;
            
            // Aktif tab'i değiştir
            document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
            e.target.classList.add('active');
            
            // Filtreyi uygula
            currentFilter = filter;
            filterAndDisplayFounders();
        });
    });
});

// Kurucuları filtrele ve göster
function filterAndDisplayFounders() {
    if (!currentFounders) return;

    let filteredFounders;
    switch (currentFilter) {
        case 'founders':
            // Bir girişimde unvanı olanlar
            filteredFounders = currentFounders.filter(founder => 
                founder.startup_id && founder.title);
            break;
        case 'others':
            // Rolü girişimci olup bir girişimde unvanı olmayanlar
            filteredFounders = currentFounders.filter(founder => 
                !founder.startup_id || !founder.title);
            break;
        default:
            // Tümü - rolü girişimci olan tüm contact'lar
            filteredFounders = currentFounders;
    }

    displayFounders(filteredFounders);
}

// Kurucuları yükle
async function loadFounders() {
    try {
        console.log('Kurucular yükleniyor...');
        
        // Önce tüm girişimci rolüne sahip kişileri al
        const contactsResponse = await fetch(`${API_URL}/api/contacts`);
        if (!contactsResponse.ok) throw new Error('Contacts yüklenirken bir hata oluştu');
        const contacts = await contactsResponse.json();
        
        // Girişimci rolüne sahip kişileri filtrele
        const entrepreneurs = contacts.filter(contact => {
            const allRoles = [contact.primary_role, ...(contact.additional_roles || [])];
            return allRoles.includes('Girişimci');
        });
        
        // Startup founder bilgilerini al
        const foundersResponse = await fetch(`${API_URL}/api/startup-founders`);
        if (!foundersResponse.ok) throw new Error('Kurucular yüklenirken bir hata oluştu');
        const founders = await foundersResponse.json();
        
        // Her girişimci için kurucu bilgilerini birleştir
        currentFounders = entrepreneurs.map(entrepreneur => {
            const founderInfo = founders.find(f => f.contact_id === entrepreneur.id) || {};
            return {
                ...entrepreneur,
                ...founderInfo
            };
        });

        console.log('Kurucular başarıyla yüklendi:', currentFounders);
        filterAndDisplayFounders();
    } catch (error) {
        console.error('Kurucular yüklenirken hata:', error);
        showAlert(error.message, 'danger');
        currentFounders = [];
        filterAndDisplayFounders();
    }
}

// Kurucuları görüntüle
function displayFounders(founders) {
    const foundersList = document.getElementById('foundersList');
    if (!foundersList) return;

    if (!founders.length) {
        foundersList.innerHTML = '<div class="col-12"><div class="alert alert-warning">Gösterilecek kurucu bulunamadı.</div></div>';
        return;
    }

    foundersList.innerHTML = founders.map(founder => `
        <div class="col-md-4 mb-4">
            <div class="card h-100">
                ${founder.photo_url ? `
                    <img src="${founder.photo_url}" class="card-img-top founder-photo" alt="${founder.name}">
                ` : ''}
                <div class="card-body">
                    <h5 class="card-title">${founder.name}</h5>
                    ${founder.startup_id ? `
                        <p class="card-text">
                            <strong>Girişim:</strong> ${founder.startup_name}<br>
                            <strong>Unvan:</strong> ${founder.title || '-'}<br>
                        </p>
                    ` : '<p class="card-text text-muted">Henüz bir girişime bağlı değil</p>'}
                    <p class="card-text">
                        <strong>Ana Rol:</strong> ${founder.primary_role}<br>
                        ${founder.additional_roles?.length ? `<strong>Ek Roller:</strong> ${founder.additional_roles.join(', ')}<br>` : ''}
                        <strong>E-posta:</strong> ${founder.email || '-'}
                    </p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm btn-outline-primary" onclick="showEditFounderModal(${founder.id})">
                        <i class="fas fa-edit"></i> Düzenle
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="showDeleteFounderModal(${founder.id})">
                        <i class="fas fa-trash"></i> Sil
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Alert göster
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
        if (alert && alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Silme modalını göster
function showDeleteModal(founderId) {
    if (!founderId) return;
    
    selectedFounderId = founderId;
    const deleteModal = document.getElementById('deleteModal');
    if (!deleteModal) return;
    
    const modal = new bootstrap.Modal(deleteModal);
    modal.show();
}

// Kurucu sil
async function confirmDelete() {
    if (!selectedFounderId) return;
    
    try {
        const response = await fetch(`${API_URL}/api/startup-founders/${selectedFounderId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Kurucu silinirken bir hata oluştu');
        }
        
        const deleteModal = document.getElementById('deleteModal');
        if (deleteModal) {
            const modal = bootstrap.Modal.getInstance(deleteModal);
            if (modal) modal.hide();
        }
        
        await loadFounders();
        showAlert('Kurucu başarıyla silindi', 'success');
    } catch (error) {
        console.error('Kurucu silinirken hata:', error);
        showAlert(error.message, 'danger');
    }
}

// Düzenleme modalını göster
async function showEditFounderModal(founderId) {
    if (!founderId) return;
    
    try {
        // Kurucu bilgilerini bul
        const founder = currentFounders.find(f => f.id === founderId);
        if (!founder) throw new Error('Kurucu bulunamadı');
        
        // Girişimci ve girişim listelerini yükle
        await Promise.all([
            loadContactsForSelect('edit_contact_id'),
            loadStartupsForSelect('edit_startup_id')
        ]);
        
        // Form alanlarını doldur
        document.getElementById('edit_founder_id').value = founderId;
        
        // Contact ve startup select'lerini doldur
        const contactSelect = document.getElementById('edit_contact_id');
        const startupSelect = document.getElementById('edit_startup_id');
        
        if (contactSelect) {
            contactSelect.value = founder.contact_id || '';
            // Eğer seçili değer yoksa, girişimciyi listeye ekle ve seç
            if (founder.contact_id && !contactSelect.value) {
                const option = document.createElement('option');
                option.value = founder.contact_id;
                option.text = founder.name;
                contactSelect.add(option);
                contactSelect.value = founder.contact_id;
            }
        }
        
        if (startupSelect) {
            startupSelect.value = founder.startup_id || '';
            // Eğer seçili değer yoksa, girişimi listeye ekle ve seç
            if (founder.startup_id && !startupSelect.value) {
                const option = document.createElement('option');
                option.value = founder.startup_id;
                option.text = founder.startup_name;
                startupSelect.add(option);
                startupSelect.value = founder.startup_id;
            }
        }
        
        document.getElementById('edit_title').value = founder.title || '';
        
        // Modalı göster
        const editModal = document.getElementById('editFounderModal');
        if (editModal) {
            const modal = new bootstrap.Modal(editModal);
            modal.show();
        }
    } catch (error) {
        console.error('Düzenleme modalı açılırken hata:', error);
        showAlert('Düzenleme modalı açılırken bir hata oluştu', 'danger');
    }
}

// Kurucu güncelle
async function submitEditFounderForm() {
    const form = document.getElementById('editFounderForm');
    if (!form) return;
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const founderId = document.getElementById('edit_founder_id')?.value;
    if (!founderId) return;
    
    const formData = {
        contact_id: parseInt(document.getElementById('edit_contact_id')?.value || '0'),
        startup_id: parseInt(document.getElementById('edit_startup_id')?.value || '0'),
        title: document.getElementById('edit_title')?.value?.trim() || ''
    };
    
    try {
        const response = await fetch(`${API_URL}/api/startup-founders/${founderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Kurucu güncellenirken bir hata oluştu');
        }
        
        const editFounderModal = document.getElementById('editFounderModal');
        if (editFounderModal) {
            const modal = bootstrap.Modal.getInstance(editFounderModal);
            if (modal) modal.hide();
        }
        
        await loadFounders();
        showAlert('Kurucu başarıyla güncellendi', 'success');
    } catch (error) {
        console.error('Kurucu güncellenirken hata:', error);
        showAlert(error.message, 'danger');
    }
}

// Startup listesini yükle
async function loadStartupsForSelect(selectId = 'startup_id') {
    try {
        const response = await fetch(`${API_URL}/api/startups`);
        if (!response.ok) throw new Error('Girişimler yüklenirken bir hata oluştu');
        const startups = await response.json();
        
        const startupSelect = document.getElementById(selectId);
        if (startupSelect) {
            startupSelect.innerHTML = '<option value="">Girişim seçin</option>';
            startups.forEach(startup => {
                startupSelect.innerHTML += `
                    <option value="${startup.id}">${startup.name}</option>
                `;
            });
        }
    } catch (error) {
        console.error('Girişimler yüklenirken hata:', error);
        showAlert('Girişimler yüklenirken hata oluştu', 'danger');
    }
}

// Girişimci listesini yükle
async function loadContactsForSelect(selectId = 'contact_id') {
    try {
        const response = await fetch(`${API_URL}/api/contacts`);
        if (!response.ok) throw new Error('Girişimciler yüklenirken bir hata oluştu');
        const contacts = await response.json();
        
        // Sadece girişimci rolüne sahip kişileri filtrele
        const entrepreneurs = contacts.filter(contact => {
            const allRoles = [contact.primary_role, ...(contact.additional_roles || [])];
            return allRoles.includes('Girişimci');
        });
        
        const contactSelect = document.getElementById(selectId);
        if (contactSelect) {
            contactSelect.innerHTML = '<option value="">Girişimci seçin</option>';
            entrepreneurs.forEach(contact => {
                contactSelect.innerHTML += `
                    <option value="${contact.id}">${contact.name}</option>
                `;
            });
        }
    } catch (error) {
        console.error('Girişimciler yüklenirken hata:', error);
        showAlert('Girişimciler yüklenirken hata oluştu', 'danger');
    }
}

// Yeni kurucu ekle
async function submitAddFounderForm() {
    const form = document.getElementById('addFounderForm');
    if (!form) return;
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = {
        contact_id: parseInt(document.getElementById('contact_id').value),
        startup_id: parseInt(document.getElementById('startup_id').value),
        title: document.getElementById('title').value.trim()
    };
    
    try {
        const response = await fetch(`${API_URL}/api/startup-founders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Kurucu eklenirken bir hata oluştu');
        }
        
        const addFounderModal = document.getElementById('addFounderModal');
        if (addFounderModal) {
            const modal = bootstrap.Modal.getInstance(addFounderModal);
            if (modal) modal.hide();
        }
        
        form.reset();
        await loadFounders();
        showAlert('Kurucu başarıyla eklendi', 'success');
    } catch (error) {
        console.error('Kurucu eklenirken hata:', error);
        showAlert(error.message, 'danger');
    }
}

// Yeni contact ekle
async function submitAddContactForm() {
    const form = document.getElementById('addContactForm');
    if (!form) return;
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Girişimci rolü ID'sini kontrol et
    console.log('Girişimci rolü ID:', window.entrepreneurRoleId);
    if (!window.entrepreneurRoleId) {
        showAlert('Girişimci rolü bulunamadı', 'danger');
        return;
    }
    
    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim() || null,
        photo_url: document.getElementById('photo_url').value.trim() || null,
        role_id: window.entrepreneurRoleId,
        additional_role_ids: [] // Sadece girişimci rolü olacak
    };
    
    console.log('Gönderilecek form verisi:', formData);
    
    try {
        console.log('API isteği yapılıyor:', `${API_URL}/api/contacts`);
        const response = await fetch(`${API_URL}/api/contacts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Girişimci eklenirken bir hata oluştu');
        }
        
        const newContact = await response.json();
        
        // Contact listesini güncelle
        await loadContactsForSelect();
        
        // Yeni eklenen contact'ı seç
        const contactSelect = document.getElementById('contact_id');
        if (contactSelect) {
            contactSelect.value = newContact.id;
        }
        
        // Contact modalını kapat
        const addContactModal = document.getElementById('addContactModal');
        if (addContactModal) {
            const modal = bootstrap.Modal.getInstance(addContactModal);
            if (modal) modal.hide();
        }
        
        // Formu temizle
        form.reset();
        
        showAlert('Girişimci başarıyla eklendi', 'success');
    } catch (error) {
        console.error('Girişimci eklenirken hata:', error);
        showAlert(error.message, 'danger');
    }
}

// Girişimci rolünün ID'sini al
async function getEntrepreneurRoleId() {
    try {
        console.log('Roller yükleniyor...');
        const response = await fetch(`${API_URL}/api/roles`);
        if (!response.ok) throw new Error('Roller yüklenirken bir hata oluştu');
        const roles = await response.json();
        console.log('Yüklenen roller:', roles);
        
        const entrepreneurRole = roles.find(role => role.role_name === 'Girişimci');
        console.log('Bulunan girişimci rolü:', entrepreneurRole);
        return entrepreneurRole ? entrepreneurRole.id : null;
    } catch (error) {
        console.error('Girişimci rolü ID\'si alınırken hata:', error);
        return null;
    }
}

// Yeni startup ekle
async function submitAddStartupForm() {
    const form = document.getElementById('addStartupForm');
    if (!form) return;
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = {
        name: document.getElementById('startup_name').value.trim(),
        website_url: document.getElementById('startup_website_url').value.trim() || null,
        linkedin_url: document.getElementById('startup_linkedin_url').value.trim() || null,
        logo_url: document.getElementById('startup_logo_url').value.trim() || null,
        use_case: document.getElementById('startup_use_case').value.trim() || null
    };
    
    try {
        const response = await fetch(`${API_URL}/api/startups`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Girişim eklenirken bir hata oluştu');
        }
        
        const newStartup = await response.json();
        
        // Startup listesini güncelle
        await loadStartupsForSelect();
        
        // Yeni eklenen startup'ı seç
        const startupSelect = document.getElementById('startup_id');
        if (startupSelect) {
            startupSelect.value = newStartup.id;
        }
        
        // Startup modalını kapat
        const addStartupModal = document.getElementById('addStartupModal');
        if (addStartupModal) {
            const modal = bootstrap.Modal.getInstance(addStartupModal);
            if (modal) modal.hide();
        }
        
        // Formu temizle
        form.reset();
        
        showAlert('Girişim başarıyla eklendi', 'success');
    } catch (error) {
        console.error('Girişim eklenirken hata:', error);
        showAlert(error.message, 'danger');
    }
}

// Girişimci düzenleme modalını göster
async function showEditContactModal() {
    const contactId = document.getElementById('edit_contact_id')?.value;
    if (!contactId) {
        showAlert('Lütfen önce bir girişimci seçin', 'warning');
        return;
    }
    
    try {
        // Rolleri yükle
        const rolesResponse = await fetch(`${API_URL}/api/roles`);
        if (!rolesResponse.ok) throw new Error('Roller yüklenirken bir hata oluştu');
        const roles = await rolesResponse.json();
        
        // Girişimci bilgilerini al
        const contactResponse = await fetch(`${API_URL}/api/contacts/${contactId}`);
        if (!contactResponse.ok) throw new Error('Girişimci bilgileri alınamadı');
        const contact = await contactResponse.json();
        
        // Form alanlarını doldur
        document.getElementById('edit_contact_form_id').value = contact.id;
        document.getElementById('edit_contact_name').value = contact.name || '';
        document.getElementById('edit_contact_email').value = contact.email || '';
        document.getElementById('edit_contact_photo_url').value = contact.photo_url || '';
        
        // Rolleri doldur ve "Girişimci" rolünün seçili olduğundan emin ol
        const rolesSelect = document.getElementById('edit_contact_roles');
        if (rolesSelect) {
            rolesSelect.innerHTML = roles.map(role => {
                // Mevcut rolleri al
                const existingRoles = [contact.primary_role, ...(contact.additional_roles || [])];
                // Eğer bu rol "Girişimci" ise veya mevcut rollerden biri ise seçili yap
                const isSelected = role.role_name === 'Girişimci' || existingRoles.includes(role.role_name);
                return `
                    <option value="${role.id}" ${isSelected ? 'selected' : ''}>
                        ${role.role_name}
                    </option>
                `;
            }).join('');
        }
        
        // Modalı göster
        const editContactModal = document.getElementById('editContactModal');
        if (editContactModal) {
            const modal = new bootstrap.Modal(editContactModal);
            modal.show();
        }
    } catch (error) {
        console.error('Girişimci bilgileri alınırken hata:', error);
        showAlert('Girişimci bilgileri alınırken bir hata oluştu', 'danger');
    }
}

// Girişimci güncelle
async function submitEditContactForm() {
    const form = document.getElementById('editContactForm');
    if (!form) return;
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const contactId = document.getElementById('edit_contact_form_id')?.value;
    if (!contactId) return;
    
    // Seçili rolleri al
    const rolesSelect = document.getElementById('edit_contact_roles');
    const selectedRoles = Array.from(rolesSelect.selectedOptions).map(option => parseInt(option.value));
    
    const formData = {
        name: document.getElementById('edit_contact_name').value.trim(),
        email: document.getElementById('edit_contact_email').value.trim() || null,
        photo_url: document.getElementById('edit_contact_photo_url').value.trim() || null,
        role_id: selectedRoles[0], // İlk seçili rol ana rol olur
        role_ids: selectedRoles.slice(1) // Geri kalan roller ek roller olur
    };
    
    try {
        const response = await fetch(`${API_URL}/api/contacts/${contactId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Girişimci güncellenirken bir hata oluştu');
        }
        
        // Contact listesini güncelle
        await loadContactsForSelect('edit_contact_id');
        
        // Modalı kapat
        const editContactModal = document.getElementById('editContactModal');
        if (editContactModal) {
            const modal = bootstrap.Modal.getInstance(editContactModal);
            if (modal) modal.hide();
        }
        
        // Kurucular listesini güncelle
        await loadFounders();
        
        showAlert('Girişimci başarıyla güncellendi', 'success');
    } catch (error) {
        console.error('Girişimci güncellenirken hata:', error);
        showAlert(error.message, 'danger');
    }
} 