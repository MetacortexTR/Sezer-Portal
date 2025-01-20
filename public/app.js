// API endpoint'leri
const API_URL = 'http://localhost:3000/api';

// Global değişkenler
let currentContacts = [];
let selectedContactId = null;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Sayfa yüklendi, rolleri ve contact\'ları yüklemeye başlıyorum...');
    try {
        await loadRoles();
        await loadContacts();
    } catch (error) {
        console.error('Sayfa yüklenirken hata:', error);
        showAlert('Veriler yüklenirken bir hata oluştu', 'danger');
    }
});

// Rolleri yükle
async function loadRoles() {
    try {
        console.log('Roller yükleniyor...');
        const response = await fetch(`${API_URL}/roles`);
        console.log('Roles API yanıtı:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Roller yüklenirken bir hata oluştu: ${response.status} ${response.statusText}`);
        }
        
        const roles = await response.json();
        console.log('Yüklenen roller:', roles);
        
        if (!Array.isArray(roles) || roles.length === 0) {
            console.warn('Hiç rol bulunamadı veya roller array değil:', roles);
            throw new Error('Roller yüklenemedi: Hiç rol bulunamadı');
        }
        
        // Role tablarını doldur
        const roleTabs = document.getElementById('roleTabs');
        if (!roleTabs) {
            console.error('roleTabs elementi bulunamadı');
            return;
        }

        console.log('Role tabları oluşturuluyor...');
        roleTabs.innerHTML = `
            <li class="nav-item">
                <a class="nav-link active" href="#" data-role="all">Tümü</a>
            </li>
        `;
        
        // Rol seçeneklerini doldur (yeni contact modalı için)
        const roleSelect = document.getElementById('role_id');
        if (roleSelect) {
            roleSelect.innerHTML = '<option value="">Rol seçin</option>';
        }
        
        // Rol seçeneklerini doldur (düzenleme modalı için)
        const editRoleSelect = document.getElementById('edit_role_id');
        if (editRoleSelect) {
            editRoleSelect.innerHTML = '<option value="">Rol seçin</option>';
        }
        
        roles.forEach(role => {
            console.log('Role ekleniyor:', role);
            // Role tabları
            roleTabs.innerHTML += `
                <li class="nav-item">
                    <a class="nav-link" href="#" data-role="${role.role_name}">${role.role_name}</a>
                </li>
            `;
            
            // Rol seçenekleri (yeni contact modalı için)
            if (roleSelect) {
                roleSelect.innerHTML += `
                    <option value="${role.id}">${role.role_name}</option>
                `;
            }
            
            // Rol seçenekleri (düzenleme modalı için)
            if (editRoleSelect) {
                editRoleSelect.innerHTML += `
                    <option value="${role.id}">${role.role_name}</option>
                `;
            }
        });
        
        // Tab click event'lerini ekle
        console.log('Tab click event\'leri ekleniyor...');
        document.querySelectorAll('#roleTabs .nav-link').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('#roleTabs .nav-link').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                filterContacts(tab.dataset.role);
            });
        });
        
        console.log('Roller başarıyla yüklendi ve görüntülendi');
    } catch (error) {
        console.error('Roller yüklenirken hata:', error);
        showAlert('Roller yüklenirken bir hata oluştu: ' + error.message, 'danger');
    }
}

// Contact'ları yükle
async function loadContacts() {
    try {
        console.log('Contact\'lar yükleniyor...');
        const response = await fetch(`${API_URL}/contacts`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Contact\'lar yüklenirken bir hata oluştu');
        }
        const contacts = await response.json();
        if (!Array.isArray(contacts)) {
            throw new Error('Sunucudan gelen veri geçerli bir contact listesi değil');
        }
        console.log('Contact\'lar başarıyla yüklendi:', contacts);
        currentContacts = contacts;
        displayContacts(contacts);
    } catch (error) {
        console.error('Contact\'lar yüklenirken hata:', error);
        showAlert(error.message, 'danger');
        // Hata durumunda boş bir dizi göster
        displayContacts([]);
    }
}

// Contact'ları görüntüle
function displayContacts(contacts) {
    const contactsList = document.getElementById('contactsList');
    contactsList.innerHTML = '';
    
    if (contacts.length === 0) {
        contactsList.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    Henüz hiç contact eklenmemiş veya seçilen role ait contact bulunmuyor.
                </div>
            </div>
        `;
        return;
    }
    
    contacts.forEach(contact => {
        // Tüm rolleri birleştir
        let allRoles = [];
        if (contact.primary_role) {
            allRoles.push(contact.primary_role);
        }
        if (contact.additional_roles && Array.isArray(contact.additional_roles)) {
            allRoles = allRoles.concat(contact.additional_roles.filter(role => role !== contact.primary_role));
        }
        
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="contact-card">
                <div class="contact-info">
                    ${contact.photo_url ? `
                        <img src="${contact.photo_url}" alt="${contact.name}" class="contact-photo mb-3">
                    ` : ''}
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-role">
                        <strong>Roller:</strong> ${allRoles.length > 0 ? allRoles.join(', ') : '-'}
                    </div>
                    <div class="contact-details">
                        <div><strong>E-posta:</strong> ${contact.email || '-'}</div>
                    </div>
                </div>
                <div class="contact-actions">
                    <button onclick="showEditModal(${contact.id})" class="edit-btn me-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="showDeleteModal(${contact.id})" class="delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        contactsList.appendChild(card);
    });
}

// Contact'ları role göre filtrele
function filterContacts(roleName) {
    if (roleName === 'all') {
        displayContacts(currentContacts);
    } else {
        const filtered = currentContacts.filter(contact => {
            const allRoles = [];
            if (contact.primary_role) {
                allRoles.push(contact.primary_role);
            }
            if (contact.additional_roles && Array.isArray(contact.additional_roles)) {
                allRoles.push(...contact.additional_roles);
            }
            return allRoles.includes(roleName);
        });
        displayContacts(filtered);
    }
}

// Contact ekle
async function submitAddContactForm() {
    const form = document.getElementById('addContactForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Seçili rolleri al
    const roleSelect = document.getElementById('role_id');
    const selectedRoles = Array.from(roleSelect.selectedOptions).map(option => parseInt(option.value));
    
    if (selectedRoles.length === 0) {
        showAlert('En az bir rol seçmelisiniz', 'warning');
        return;
    }
    
    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        photo_url: document.getElementById('photo_url').value.trim() || null,
        role_ids: selectedRoles
    };
    
    try {
        const response = await fetch(`${API_URL}/contacts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Contact eklenirken bir hata oluştu');
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addContactModal'));
        modal.hide();
        form.reset();
        await loadContacts();
        showAlert('Contact başarıyla eklendi', 'success');
    } catch (error) {
        console.error('Contact eklenirken hata:', error);
        showAlert(error.message, 'danger');
    }
}

// Silme modalını göster
function showDeleteModal(contactId) {
    selectedContactId = contactId;
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    deleteModal.show();
}

// Contact'ı sil
async function confirmDelete() {
    if (!selectedContactId) return;
    
    try {
        const response = await fetch(`${API_URL}/contacts/${selectedContactId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Contact silinirken bir hata oluştu');
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
        modal.hide();
        await loadContacts();
        showAlert('Contact başarıyla silindi', 'success');
    } catch (error) {
        console.error('Contact silinirken hata:', error);
        showAlert(error.message, 'danger');
    }
}

// Contact'ı düzenleme modalını göster
async function showEditModal(contactId) {
    try {
        console.log('Düzenlenecek contact ID:', contactId);
        
        // Önce rolleri yükle
        const rolesResponse = await fetch(`${API_URL}/roles`);
        if (!rolesResponse.ok) throw new Error('Roller yüklenirken bir hata oluştu');
        const roles = await rolesResponse.json();
        console.log('Yüklenen roller:', roles);
        
        // Contact bilgilerini getir
        const contactResponse = await fetch(`${API_URL}/contacts/${contactId}`);
        if (!contactResponse.ok) throw new Error('Contact bilgileri alınamadı');
        const contact = await contactResponse.json();
        console.log('Alınan contact bilgileri:', contact);

        // Form alanlarını doldur
        const formElements = {
            id: document.getElementById('edit_contact_id'),
            name: document.getElementById('edit_name'),
            email: document.getElementById('edit_email'),
            photoUrl: document.getElementById('edit_photo_url'),
            roleSelect: document.getElementById('edit_role_id')
        };

        // Form elemanlarının varlığını kontrol et
        Object.entries(formElements).forEach(([key, element]) => {
            if (!element) {
                throw new Error(`${key} form elementi bulunamadı`);
            }
        });

        // Form değerlerini doldur
        formElements.id.value = contactId;
        formElements.name.value = contact.name || '';
        formElements.email.value = contact.email || '';
        formElements.photoUrl.value = contact.photo_url || '';
        
        // Rol seçeneklerini doldur
        formElements.roleSelect.innerHTML = '<option value="">Rol seçin</option>';
        roles.forEach(role => {
            formElements.roleSelect.innerHTML += `
                <option value="${role.id}">
                    ${role.role_name}
                </option>
            `;
        });

        // Ana rolü seç
        if (contact.primary_role_id) {
            const primaryOption = formElements.roleSelect.querySelector(`option[value="${contact.primary_role_id}"]`);
            if (primaryOption) {
                primaryOption.selected = true;
            }
        }

        // Ek rolleri seç
        if (contact.additional_role_ids && Array.isArray(contact.additional_role_ids)) {
            contact.additional_role_ids.forEach(roleId => {
                const option = formElements.roleSelect.querySelector(`option[value="${roleId}"]`);
                if (option) {
                    option.selected = true;
                }
            });
        }
        
        // Modalı göster
        const editModal = new bootstrap.Modal(document.getElementById('editContactModal'));
        editModal.show();
    } catch (error) {
        console.error('Contact bilgileri alınırken hata:', error);
        showAlert(error.message, 'danger');
    }
}

// Contact güncelle
async function submitEditContactForm() {
    try {
        const form = document.getElementById('editContactForm');
        if (!form) {
            throw new Error('Form elementi bulunamadı');
        }
        
        // Form validasyonu
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        // Form elemanlarını kontrol et
        const contactId = document.getElementById('edit_contact_id')?.value;
        if (!contactId) {
            throw new Error('Contact ID bulunamadı');
        }

        const nameElement = document.getElementById('edit_name');
        const emailElement = document.getElementById('edit_email');
        const photoUrlElement = document.getElementById('edit_photo_url');
        const roleSelect = document.getElementById('edit_role_id');

        if (!nameElement || !emailElement || !photoUrlElement || !roleSelect) {
            throw new Error('Gerekli form elemanları bulunamadı');
        }

        // Seçili rolleri al
        const selectedRoles = Array.from(roleSelect.selectedOptions).map(option => parseInt(option.value));
        if (selectedRoles.length === 0) {
            throw new Error('En az bir rol seçmelisiniz');
        }

        const contactData = {
            name: nameElement.value.trim(),
            email: emailElement.value.trim(),
            photo_url: photoUrlElement.value.trim() || null,
            role_id: selectedRoles[0], // İlk seçilen rol primary role olsun
            additional_role_ids: selectedRoles.slice(1) // Geri kalan roller additional roles olsun
        };

        console.log('Gönderilecek veriler:', contactData);
        
        // Contact'ı güncelle
        const response = await fetch(`${API_URL}/contacts/${contactId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(contactData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Contact güncellenirken bir hata oluştu');
        }
        
        // Contact düzenleme modalını kapat
        const modal = bootstrap.Modal.getInstance(document.getElementById('editContactModal'));
        modal.hide();
        
        // Listeyi yenile
        await loadContacts();
        showAlert('Contact başarıyla güncellendi', 'success');
    } catch (error) {
        console.error('Contact güncellenirken hata:', error);
        showAlert(error.message, 'danger');
    }
}

// Alert göster
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.appendChild(alert);
    
    // 5 saniye sonra alert'i kaldır
    setTimeout(() => {
        alert.remove();
    }, 5000);
} 