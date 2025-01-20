// Global değişkenler
let selectedMentorId = null;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    await loadMentorRoleId();
    await loadRoles();
    await loadMentors();
});

// Mentor rolünün ID'sini al
async function loadMentorRoleId() {
    try {
        const response = await fetch(`${API_URL}/roles`);
        if (!response.ok) throw new Error('Roller yüklenirken bir hata oluştu');
        const roles = await response.json();
        const mentorRole = roles.find(role => role.role_name.toLowerCase() === 'mentor');
        if (mentorRole) {
            const roleIdInput = document.getElementById('role_id');
            if (roleIdInput) {
                roleIdInput.value = mentorRole.id;
                console.log('Mentor rolü ID\'si atandı:', mentorRole.id);
            } else {
                console.error('role_id input elementi bulunamadı');
            }
        } else {
            console.error('Mentor rolü bulunamadı');
            throw new Error('Mentor rolü bulunamadı');
        }
    } catch (error) {
        console.error('Roller yüklenirken hata:', error);
        showAlert('Roller yüklenirken hata oluştu: ' + error.message, 'danger');
    }
}

// Yeni mentor ekle
async function submitAddMentorForm() {
    const form = document.getElementById('addMentorForm');
    
    // Form validasyonu
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        photo_url: document.getElementById('photo_url').value.trim() || null,
        expertise_area: document.getElementById('expertise_area').value.trim() || null,
        mentoring_focus: document.getElementById('mentoring_focus').value.trim() || null,
        role_id: parseInt(document.getElementById('role_id').value)
    };
    
    try {
        const response = await fetch(`${API_URL}/mentors`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Mentor eklenirken bir hata oluştu');
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addMentorModal'));
        if (modal) modal.hide();
        form.reset();
        await loadMentors();
        showAlert('Mentor başarıyla eklendi', 'success');
    } catch (error) {
        console.error('Mentor eklenirken hata:', error);
        showAlert(error.message, 'danger');
    }
}

// Düzenleme modalını göster
async function editMentor(mentorId, mentorName) {
    try {
        console.log('Düzenlenecek mentor ID:', mentorId);
        
        // Önce rolleri yükle
        await loadRoles();
        
        // Contact bilgilerini getir
        const contactResponse = await fetch(`${API_URL}/contacts/${mentorId}`);
        if (!contactResponse.ok) throw new Error('Contact bilgileri alınamadı');
        const contact = await contactResponse.json();
        console.log('Alınan contact bilgileri:', contact);
        
        // Form alanlarını doldur
        document.getElementById('edit_mentor_id').value = mentorId;
        document.getElementById('edit_contact').value = contact.name;
        
        // Mentor detaylarını getir
        const mentorResponse = await fetch(`${API_URL}/contacts/${mentorId}/mentor-details`);
        if (!mentorResponse.ok) throw new Error('Mentor detayları alınamadı');
        
        const mentorDetails = await mentorResponse.json();
        console.log('Alınan mentor detayları:', mentorDetails);

        // Mentor detaylarını doldur
        document.getElementById('edit_expertise_area').value = mentorDetails.expertise_area || '';
        document.getElementById('edit_mentoring_focus').value = mentorDetails.mentoring_focus || '';
        
        // Contact düzenleme formunu hazırla
        document.getElementById('contact_id').value = mentorId;
        document.getElementById('contact_name').value = contact.name;
        document.getElementById('contact_email').value = contact.email || '';
        document.getElementById('contact_photo_url').value = contact.photo_url || '';
        
        // Ana rolü seç
        const roleSelect = document.getElementById('contact_role');
        if (roleSelect && contact.primary_role_id) {
            roleSelect.value = contact.primary_role_id;
        }
        
        // Ek rolleri seç
        const additionalRolesSelect = document.getElementById('contact_additional_roles');
        if (additionalRolesSelect && contact.additional_role_ids) {
            // Önce tüm seçimleri temizle
            Array.from(additionalRolesSelect.options).forEach(option => {
                option.selected = false;
            });
            
            // Sonra ek rolleri seç
            contact.additional_role_ids.forEach(roleId => {
                const option = additionalRolesSelect.querySelector(`option[value="${roleId}"]`);
                if (option) {
                    option.selected = true;
                }
            });
        }
        
        // Modalı göster
        const editModal = new bootstrap.Modal(document.getElementById('editMentorModal'));
        editModal.show();
    } catch (error) {
        console.error('Mentor detayları alınırken hata:', error);
        showAlert('Mentor detayları alınamadı: ' + error.message, 'danger');
    }
}

// Contact düzenleme modalını aç
function editContact() {
    const mentorId = document.getElementById('edit_mentor_id').value;
    const mentorName = document.getElementById('edit_contact').value;
    const mentorModal = bootstrap.Modal.getInstance(document.getElementById('editMentorModal'));
    mentorModal.hide();
    
    // Contact bilgilerini getir
    fetch(`${API_URL}/contacts/${mentorId}`)
        .then(response => {
            if (!response.ok) throw new Error('Contact bilgileri alınamadı');
            return response.json();
        })
        .then(contact => {
            // Contact düzenleme modalını hazırla
            document.getElementById('contact_id').value = contact.id;
            document.getElementById('contact_name').value = contact.name;
            document.getElementById('contact_email').value = contact.email || '';
            document.getElementById('contact_photo_url').value = contact.photo_url || '';
            
            // Rolleri seç
            const roleSelect = document.getElementById('contact_role');
            if (roleSelect) {
                roleSelect.value = contact.primary_role_id;
                
                // Ek rolleri seç
                const additionalRoles = document.getElementById('contact_additional_roles');
                if (additionalRoles && contact.additional_role_ids) {
                    contact.additional_role_ids.forEach(roleId => {
                        const option = additionalRoles.querySelector(`option[value="${roleId}"]`);
                        if (option) option.selected = true;
                    });
                }
            }
            
            // Contact düzenleme modalını göster
            const contactModal = new bootstrap.Modal(document.getElementById('editContactModal'));
            contactModal.show();
        })
        .catch(error => {
            console.error('Contact bilgileri alınırken hata:', error);
            showAlert(error.message, 'danger');
            // Mentor düzenleme modalını tekrar aç
            const mentorModal = new bootstrap.Modal(document.getElementById('editMentorModal'));
            mentorModal.show();
        });
}

// Mentor güncelle
async function submitEditMentorForm() {
    const form = document.getElementById('editMentorForm');
    
    // Form validasyonu
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const mentorId = document.getElementById('edit_mentor_id').value;
    
    try {
        // Önce mevcut mentor bilgilerini al
        const getResponse = await fetch(`${API_URL}/mentors/${mentorId}`);
        if (!getResponse.ok) throw new Error('Mentor bilgileri alınamadı');
        const currentMentor = await getResponse.json();
        
        // Mevcut bilgileri koru, sadece değişenleri güncelle
        const mentorData = {
            name: document.getElementById('edit_contact').value.trim(),
            email: currentMentor.email, // Mevcut email'i koru
            photo_url: currentMentor.photo_url, // Mevcut photo_url'i koru
            expertise_area: document.getElementById('edit_expertise_area').value.trim() || null,
            mentoring_focus: document.getElementById('edit_mentoring_focus').value.trim() || null
        };
        
        // Mentor detaylarını güncelle
        const response = await fetch(`${API_URL}/mentors/${mentorId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(mentorData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Mentor detayları güncellenirken bir hata oluştu');
        }
        
        // Modalı kapat ve listeyi yenile
        const modal = bootstrap.Modal.getInstance(document.getElementById('editMentorModal'));
        modal.hide();
        await loadMentors();
        showAlert('Mentor başarıyla güncellendi', 'success');
    } catch (error) {
        console.error('Mentor güncellenirken hata:', error);
        showAlert(error.message, 'danger');
    }
}

// Silme modalını göster
function deleteMentor(mentorId) {
    selectedMentorId = mentorId;
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteMentorModal'));
    deleteModal.show();
}

// Mentor sil
async function confirmDeleteMentor() {
    if (!selectedMentorId) return;
    
    try {
        const response = await fetch(`${API_URL}/mentors/${selectedMentorId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Mentor silinirken bir hata oluştu');
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteMentorModal'));
        modal.hide();
        await loadMentors();
        showAlert('Mentor başarıyla silindi', 'success');
    } catch (error) {
        console.error('Mentor silinirken hata:', error);
        showAlert(error.message, 'danger');
    }
}

// Mentorları yükle
async function loadMentors() {
    try {
        // Önce mentor rolünün ID'sini al
        const rolesResponse = await fetch(`${API_URL}/roles`);
        if (!rolesResponse.ok) throw new Error('Roller yüklenirken bir hata oluştu');
        const roles = await rolesResponse.json();
        const mentorRole = roles.find(role => role.role_name.toLowerCase() === 'mentor');
        
        if (!mentorRole) {
            throw new Error('Mentor rolü bulunamadı');
        }

        // Tüm contact'ları getir
        const response = await fetch(`${API_URL}/contacts`);
        if (!response.ok) throw new Error('Mentorlar yüklenirken bir hata oluştu');
        const contacts = await response.json();
        
        // Mentor rolüne sahip olanları filtrele
        const mentors = contacts.filter(contact => 
            contact.primary_role_id === mentorRole.id || 
            contact.additional_role_ids?.includes(mentorRole.id)
        );
        
        console.log('Yüklenen mentorlar:', mentors);
        displayMentors(mentors);
    } catch (error) {
        console.error('Mentorlar yüklenirken hata:', error);
        showAlert('Mentorlar yüklenirken hata oluştu', 'danger');
    }
}

// Mentorları görüntüle
function displayMentors(mentors) {
    console.log('displayMentors fonksiyonu çağrıldı');
    console.log('Gelen mentors verisi:', mentors);
    
    const mentorsList = document.getElementById('mentorsList');
    console.log('mentorsList elementi:', mentorsList);
    
    if (!mentorsList) {
        console.error('mentorsList elementi bulunamadı');
        return;
    }
    
    mentorsList.innerHTML = '';
    
    if (!mentors || mentors.length === 0) {
        mentorsList.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    Henüz hiç mentor bulunmuyor.
                </div>
            </div>
        `;
        return;
    }
    
    mentors.forEach(mentor => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="contact-card">
                <div class="contact-info">
                    ${mentor.photo_url ? `
                        <img src="${mentor.photo_url}" 
                             alt="${mentor.name}" 
                             class="contact-photo mb-3"
                             onerror="this.onerror=null; this.src='https://via.placeholder.com/150?text=👤';">
                    ` : `<img src="https://via.placeholder.com/150?text=👤" alt="Varsayılan profil" class="contact-photo mb-3">`}
                    <div class="contact-name">${mentor.name}</div>
                    <div class="contact-details">
                        <div><strong>E-posta:</strong> ${mentor.email || '-'}</div>
                        <div><strong>Ana Rol:</strong> ${mentor.primary_role || '-'}</div>
                        <div><strong>Ek Roller:</strong> ${mentor.additional_roles?.join(', ') || '-'}</div>
                    </div>
                </div>
                <div class="contact-actions mt-3">
                    <button onclick="editMentor(${mentor.id}, '${mentor.name}')" 
                            class="btn btn-sm btn-outline-primary me-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteMentor(${mentor.id})" 
                            class="btn btn-sm btn-outline-danger">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        mentorsList.appendChild(card);
    });
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

// Rolleri yükle
async function loadRoles() {
    try {
        const response = await fetch(`${API_URL}/roles`);
        if (!response.ok) throw new Error('Roller yüklenirken bir hata oluştu');
        const roles = await response.json();
        
        // Ana rol select'ini doldur
        const roleSelect = document.getElementById('contact_role');
        if (roleSelect) {
            roleSelect.innerHTML = '<option value="">Rol seçin...</option>';
            roles.forEach(role => {
                roleSelect.innerHTML += `<option value="${role.id}">${role.role_name}</option>`;
            });
        }
        
        // Ek roller select'ini doldur
        const additionalRoles = document.getElementById('contact_additional_roles');
        if (additionalRoles) {
            additionalRoles.innerHTML = '';
            roles.forEach(role => {
                additionalRoles.innerHTML += `<option value="${role.id}">${role.role_name}</option>`;
            });
        }
    } catch (error) {
        console.error('Roller yüklenirken hata:', error);
        showAlert('Roller yüklenirken hata oluştu: ' + error.message, 'danger');
    }
}

// Contact düzenleme modalını kapat
function closeContactModal() {
    const contactModal = bootstrap.Modal.getInstance(document.getElementById('editContactModal'));
    contactModal.hide();
    
    // Mentor düzenleme modalını tekrar aç
    const mentorModal = new bootstrap.Modal(document.getElementById('editMentorModal'));
    mentorModal.show();
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
        const contactIdElement = document.getElementById('contact_id');
        const nameElement = document.getElementById('contact_name');
        const emailElement = document.getElementById('contact_email');
        const photoUrlElement = document.getElementById('contact_photo_url');
        const roleElement = document.getElementById('contact_role');
        const additionalRolesElement = document.getElementById('contact_additional_roles');

        if (!contactIdElement || !nameElement || !emailElement || !photoUrlElement || !roleElement || !additionalRolesElement) {
            throw new Error('Gerekli form elemanları bulunamadı');
        }

        const contactId = contactIdElement.value;
        const contactData = {
            name: nameElement.value.trim(),
            email: emailElement.value.trim(),
            photo_url: photoUrlElement.value.trim() || null,
            role_id: parseInt(roleElement.value),
            additional_role_ids: Array.from(additionalRolesElement.selectedOptions).map(option => parseInt(option.value))
        };
        
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
        const contactModal = bootstrap.Modal.getInstance(document.getElementById('editContactModal'));
        if (contactModal) {
            contactModal.hide();
        }
        
        // Mentor düzenleme modalını tekrar aç ve listeyi yenile
        const mentorModal = new bootstrap.Modal(document.getElementById('editMentorModal'));
        mentorModal.show();
        await loadMentors();
        showAlert('Contact başarıyla güncellendi', 'success');
    } catch (error) {
        console.error('Contact güncellenirken hata:', error);
        showAlert(error.message, 'danger');
    }
} 