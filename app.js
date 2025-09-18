// Supabase Configuration
const SUPABASE_URL = 'https://ebrwfexnxhpstkfzdkax.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVicndmZXhueGhwc3RrZnpka2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2Mzk0MTMsImV4cCI6MjA3MTIxNTQxM30.VwtwesSfm1_O-2D0orbA1McKUsMQqXZLo6Jg2d0YG5k';

// Initialize Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let currentAdmin = null;
let isLoggedIn = false;

// Test admin accounts (fallback)
const testAdmins = {
    'admin@test.com': {
        password: '123456',
        user: {
            id: 'admin_1',
            email: 'admin@test.com',
            name: 'Test Admin',
            role: 'super_admin',
            permissions: ['manage_users', 'ban_users', 'view_user_data', 'moderate_content', 'delete_content', 'view_reports', 'give_strikes', 'manage_strikes', 'view_strikes', 'view_analytics', 'export_data', 'system_settings', 'audit_logs']
        }
    },
    'moderator@test.com': {
        password: '123456',
        user: {
            id: 'mod_1',
            email: 'moderator@test.com',
            name: 'Test Moderator',
            role: 'moderator',
            permissions: ['moderate_content', 'view_reports', 'give_strikes', 'view_strikes']
        }
    }
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize Application
function initializeApp() {
    // Check if user is already logged in
    const savedAdmin = localStorage.getItem('admin_user');
    if (savedAdmin) {
        try {
            currentAdmin = JSON.parse(savedAdmin);
            isLoggedIn = true;
            showAdminDashboard();
        } catch (e) {
            console.error('Error parsing saved admin:', e);
            localStorage.removeItem('admin_user');
        }
    }

    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    loadDashboardData();
}

// Setup Event Listeners
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Logout button
    const logoutBtn = document.querySelector('[onclick="logout()"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showAlert('Lütfen tüm alanları doldurun.', 'danger');
        return;
    }

    showLoading(true);

    try {
        // Try Supabase login first
        const result = await loginWithSupabase(email, password);
        
        if (result.success) {
            currentAdmin = result.user;
            isLoggedIn = true;
            localStorage.setItem('admin_user', JSON.stringify(currentAdmin));
            showAdminDashboard();
            showAlert('Giriş başarılı!', 'success');
        } else {
            // Fallback to test accounts
            const testResult = loginWithTestAccount(email, password);
            if (testResult.success) {
                currentAdmin = testResult.user;
                isLoggedIn = true;
                localStorage.setItem('admin_user', JSON.stringify(currentAdmin));
                showAdminDashboard();
                showAlert('Test hesabı ile giriş başarılı!', 'success');
            } else {
                showAlert(result.message || 'Giriş bilgileri hatalı.', 'danger');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Giriş sırasında hata oluştu.', 'danger');
    } finally {
        showLoading(false);
    }
}

// Login with Supabase
async function loginWithSupabase(email, password) {
    try {
        // Test hesapları için direkt false döndür ki fallback çalışsın
        if (email === 'admin@test.com' || email === 'moderator@test.com') {
            return { success: false, message: 'Test hesabı - fallback kullanılacak' };
        }
        
        const { data, error } = await supabase.rpc('admin_login', {
            email_param: email,
            password_param: password
        });

        if (error) {
            return { success: false, message: 'Supabase bağlantı hatası' };
        }

        if (data && data.success) {
            return { success: true, user: data.admin_user };
        } else {
            return { success: false, message: data?.message || 'Giriş başarısız' };
        }
    } catch (error) {
        console.error('Supabase login error:', error);
        return { success: false, message: 'Supabase bağlantı hatası' };
    }
}

// Login with test account
function loginWithTestAccount(email, password) {
    const adminData = testAdmins[email];
    
    if (adminData && adminData.password === password) {
        return { success: true, user: adminData.user };
    } else {
        return { success: false, message: 'Giriş bilgileri hatalı' };
    }
}

// Show Admin Dashboard
function showAdminDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    
    // Update admin name
    const adminNameElement = document.getElementById('adminName');
    if (adminNameElement && currentAdmin) {
        adminNameElement.textContent = currentAdmin.name;
    }
    
    // Load dashboard data
    loadDashboardData();
}

// Show Login Page
function showLoginPage() {
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('loginPage').style.display = 'flex';
    
    // Clear form
    document.getElementById('loginForm').reset();
}

// Logout
function logout() {
    currentAdmin = null;
    isLoggedIn = false;
    localStorage.removeItem('admin_user');
    showLoginPage();
    showAlert('Çıkış yapıldı.', 'info');
}

// Show Page
function showPage(pageName) {
    // Hide all pages
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => page.classList.remove('active'));
    
    // Show selected page
    const selectedPage = document.getElementById(pageName + 'Page');
    if (selectedPage) {
        selectedPage.classList.add('active');
    }
    
    // Update navigation
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    navLinks.forEach(link => link.classList.remove('active'));
    
    const activeLink = document.querySelector(`[onclick="showPage('${pageName}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Load page data
    loadPageData(pageName);
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Load statistics
        await loadStatistics();
        
        // Load recent activities
        await loadRecentActivities();
        
        // Check system status
        await checkSystemStatus();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load Statistics
async function loadStatistics() {
    try {
        // Try to load from Supabase
        const { data, error } = await supabase
            .from('admin_users')
            .select('count')
            .single();

        if (!error && data) {
            // Update with real data
            document.getElementById('totalUsers').textContent = data.count || '1,234';
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        // Keep default values
    }
}

// Load Recent Activities
async function loadRecentActivities() {
    try {
        // Try to load from Supabase
        const { data, error } = await supabase
            .from('admin_audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (!error && data) {
            updateRecentActivitiesTable(data);
        }
    } catch (error) {
        console.error('Error loading recent activities:', error);
        // Keep default data
    }
}

// Update Recent Activities Table
function updateRecentActivitiesTable(activities) {
    const tbody = document.getElementById('recentActivities');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    activities.forEach(activity => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${activity.admin_id}</td>
            <td>${activity.details}</td>
            <td>${formatDate(activity.created_at)}</td>
            <td><span class="badge badge-success">Tamamlandı</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Check System Status
async function checkSystemStatus() {
    try {
        // Test Supabase connection
        const { data, error } = await supabase
            .from('admin_users')
            .select('count')
            .limit(1);

        const statusElements = document.querySelectorAll('.status-indicator');
        statusElements.forEach(element => {
            if (element.classList.contains('status-online')) {
                element.className = 'status-indicator ' + (error ? 'status-offline' : 'status-online');
            }
        });
    } catch (error) {
        console.error('Error checking system status:', error);
    }
}

// Load Page Data
function loadPageData(pageName) {
    switch (pageName) {
        case 'moderation':
            loadModerationData();
            break;
        case 'strikes':
            loadStrikesData();
            break;
        case 'users':
            loadUsersData();
            break;
        case 'analytics':
            loadAnalyticsData();
            break;
        case 'settings':
            loadSettingsData();
            break;
    }
}

// Load Moderation Data
async function loadModerationData() {
    try {
        // Load reports from Supabase
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error && data) {
            updateReportsTable(data);
        }
    } catch (error) {
        console.error('Error loading moderation data:', error);
    }
}

// Update Reports Table
function updateReportsTable(reports) {
    const tbody = document.getElementById('reportsTable');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    reports.forEach(report => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${report.id}</td>
            <td>${report.reporter_id}</td>
            <td>${report.reported_user_id}</td>
            <td>${report.reason}</td>
            <td><span class="badge badge-${getStatusColor(report.status)}">${report.status}</span></td>
            <td>${formatDate(report.created_at)}</td>
            <td>
                <button class="btn btn-sm btn-primary me-1" onclick="reviewReport('${report.id}')">İncele</button>
                <button class="btn btn-sm btn-success me-1" onclick="approveReport('${report.id}')">Onayla</button>
                <button class="btn btn-sm btn-danger" onclick="rejectReport('${report.id}')">Reddet</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Get Status Color
function getStatusColor(status) {
    switch (status) {
        case 'pending': return 'warning';
        case 'reviewing': return 'info';
        case 'resolved': return 'success';
        case 'rejected': return 'danger';
        default: return 'secondary';
    }
}

// Report Actions
function reviewReport(reportId) {
    showAlert(`Rapor ${reportId} inceleniyor...`, 'info');
}

function approveReport(reportId) {
    showAlert(`Rapor ${reportId} onaylandı.`, 'success');
}

function rejectReport(reportId) {
    showAlert(`Rapor ${reportId} reddedildi.`, 'danger');
}

// Load Strikes Data
function loadStrikesData() {
    console.log('Loading strikes data...');
}

// Load Users Data
function loadUsersData() {
    console.log('Loading users data...');
}

// Load Analytics Data
function loadAnalyticsData() {
    console.log('Loading analytics data...');
}

// Load Settings Data
function loadSettingsData() {
    console.log('Loading settings data...');
}

// Show Profile
function showProfile() {
    if (currentAdmin) {
        showAlert(`Profil: ${currentAdmin.name} (${currentAdmin.role})`, 'info');
    }
}

// Utility Functions
function showAlert(message, type = 'info') {
    const alertDiv = document.getElementById('loginAlert');
    if (alertDiv) {
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        alertDiv.style.display = 'block';
        
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 5000);
    } else {
        // Create temporary alert for dashboard
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alert.style.top = '20px';
        alert.style.right = '20px';
        alert.style.zIndex = '9999';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

function showLoading(show) {
    const loginText = document.querySelector('.login-text');
    const loading = document.querySelector('.loading');
    
    if (show) {
        loginText.style.display = 'none';
        loading.style.display = 'inline';
    } else {
        loginText.style.display = 'inline';
        loading.style.display = 'none';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    
    return date.toLocaleDateString('tr-TR');
}

// Initialize page
showPage('dashboard');
