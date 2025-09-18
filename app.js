// Supabase Configuration
const SUPABASE_URL = 'https://ebrwfexnxhpstkfzdkax.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVicndmZXhueGhwc3RrZnpka2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2Mzk0MTMsImV4cCI6MjA3MTIxNTQxM30.VwtwesSfm1_O-2D0orbA1McKUsMQqXZLo6Jg2d0YG5k';

// Initialize Supabase client (wait for supabase to be available)
let supabase = null;

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
    // Initialize Supabase client
    try {
        if (typeof window.supabase !== 'undefined') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase initialized successfully');
        } else {
            console.log('Supabase library not loaded, using test mode');
        }
    } catch (error) {
        console.log('Supabase initialization failed, using test mode:', error);
    }
    
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
        // Test hesapları için direkt test login kullan
        if (email === 'admin@test.com' || email === 'moderator@test.com') {
            const testResult = loginWithTestAccount(email, password);
            if (testResult.success) {
                currentAdmin = testResult.user;
                isLoggedIn = true;
                localStorage.setItem('admin_user', JSON.stringify(currentAdmin));
                showAdminDashboard();
                showAlert('Test hesabı ile giriş başarılı!', 'success');
            } else {
                showAlert('Giriş bilgileri hatalı.', 'danger');
            }
        } else {
            // Gerçek hesaplar için önce Supabase'i dene
            if (supabase) {
                const result = await loginWithSupabase(email, password);
                
                if (result.success) {
                    currentAdmin = result.user;
                    isLoggedIn = true;
                    localStorage.setItem('admin_user', JSON.stringify(currentAdmin));
                    showAdminDashboard();
                    showAlert('Supabase ile giriş başarılı!', 'success');
                } else {
                    showAlert(result.message || 'Giriş bilgileri hatalı.', 'danger');
                }
            } else {
                showAlert('Supabase bağlantısı yok. Test hesaplarını kullanın.', 'warning');
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
        // Supabase henüz yüklenmemişse
        if (!supabase) {
            return { success: false, message: 'Supabase henüz yüklenmedi' };
        }
        
        // Admin login fonksiyonu çağır
        const { data, error } = await supabase.rpc('admin_login', {
            email_param: email,
            password_param: password
        });

        if (error) {
            console.error('Supabase RPC error:', error);
            return { success: false, message: 'Supabase bağlantı hatası: ' + error.message };
        }

        if (data && data.success) {
            return { success: true, user: data.admin_user };
        } else {
            return { success: false, message: data?.message || 'Giriş bilgileri hatalı' };
        }
    } catch (error) {
        console.error('Supabase login error:', error);
        return { success: false, message: 'Supabase bağlantı hatası: ' + error.message };
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
        if (supabase) {
            // Gerçek verileri Supabase'den çek
            const [usersResult, reportsResult, strikesResult] = await Promise.all([
                supabase.from('users').select('id', { count: 'exact' }),
                supabase.from('reports').select('id', { count: 'exact' }).eq('status', 'pending'),
                supabase.from('user_strikes').select('id', { count: 'exact' })
            ]);

            // Toplam kullanıcı sayısı
            if (!usersResult.error) {
                document.getElementById('totalUsers').textContent = usersResult.count || '0';
            }

            // Aktif kullanıcı sayısı (son 7 gün içinde giriş yapanlar)
            if (!usersResult.error) {
                const activeUsersResult = await supabase
                    .from('users')
                    .select('id', { count: 'exact' })
                    .gte('last_login', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
                
                if (!activeUsersResult.error) {
                    document.getElementById('activeUsers').textContent = activeUsersResult.count || '0';
                }
            }

            // Bekleyen rapor sayısı
            if (!reportsResult.error) {
                document.getElementById('pendingReports').textContent = reportsResult.count || '0';
            }

            // Toplam ikaz sayısı
            if (!strikesResult.error) {
                document.getElementById('totalStrikes').textContent = strikesResult.count || '0';
            }
        } else {
            console.log('Supabase not available, keeping default values');
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
        if (supabase) {
            // Test Supabase connection
            const { data, error } = await supabase
                .from('users')
                .select('id')
                .limit(1);

            const statusElements = document.querySelectorAll('.status-indicator');
            statusElements.forEach(element => {
                if (element.classList.contains('status-online')) {
                    element.className = 'status-indicator ' + (error ? 'status-offline' : 'status-online');
                }
            });

            // Supabase bağlantı durumunu güncelle
            const supabaseStatusElement = document.querySelector('.status-indicator.status-online');
            if (supabaseStatusElement) {
                supabaseStatusElement.className = 'status-indicator ' + (error ? 'status-offline' : 'status-online');
            }
        } else {
            // Supabase yoksa offline göster
            const statusElements = document.querySelectorAll('.status-indicator');
            statusElements.forEach(element => {
                if (element.classList.contains('status-online')) {
                    element.className = 'status-indicator status-offline';
                }
            });
        }
    } catch (error) {
        console.error('Error checking system status:', error);
        // Hata durumunda offline göster
        const statusElements = document.querySelectorAll('.status-indicator');
        statusElements.forEach(element => {
            if (element.classList.contains('status-online')) {
                element.className = 'status-indicator status-offline';
            }
        });
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
        if (supabase) {
            // Rapor istatistiklerini yükle
            const [pendingReports, reviewingReports, resolvedReports, rejectedReports] = await Promise.all([
                supabase.from('reports').select('id', { count: 'exact' }).eq('status', 'pending'),
                supabase.from('reports').select('id', { count: 'exact' }).eq('status', 'reviewing'),
                supabase.from('reports').select('id', { count: 'exact' }).eq('status', 'resolved'),
                supabase.from('reports').select('id', { count: 'exact' }).eq('status', 'rejected')
            ]);

            // İstatistikleri güncelle
            updateModerationStats({
                pending: pendingReports.count || 0,
                reviewing: reviewingReports.count || 0,
                resolved: resolvedReports.count || 0,
                rejected: rejectedReports.count || 0
            });

            // Raporları yükle
            const { data, error } = await supabase
                .from('reports')
                .select(`
                    *,
                    reporter:users!reports_reporter_id_fkey(name, email),
                    reported_user:users!reports_reported_user_id_fkey(name, email)
                `)
                .order('created_at', { ascending: false })
                .limit(20);

            if (!error && data) {
                updateReportsTable(data);
            }
        } else {
            console.log('Supabase not available, using default data');
        }
    } catch (error) {
        console.error('Error loading moderation data:', error);
    }
}

// Update Moderation Stats
function updateModerationStats(stats) {
    // İstatistik kartlarını güncelle
    const pendingCard = document.querySelector('.col-md-3:nth-child(1) .card-body h3');
    const reviewingCard = document.querySelector('.col-md-3:nth-child(2) .card-body h3');
    const resolvedCard = document.querySelector('.col-md-3:nth-child(3) .card-body h3');
    const rejectedCard = document.querySelector('.col-md-3:nth-child(4) .card-body h3');

    if (pendingCard) pendingCard.textContent = stats.pending;
    if (reviewingCard) reviewingCard.textContent = stats.reviewing;
    if (resolvedCard) resolvedCard.textContent = stats.resolved;
    if (rejectedCard) rejectedCard.textContent = stats.rejected;
}

// Update Reports Table
function updateReportsTable(reports) {
    const tbody = document.getElementById('reportsTable');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    reports.forEach(report => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${report.id.substring(0, 8)}</td>
            <td>${report.reporter?.name || report.reporter_id}</td>
            <td>${report.reported_user?.name || report.reported_user_id}</td>
            <td>${report.reason}</td>
            <td><span class="badge badge-${getStatusColor(report.status)}">${getStatusText(report.status)}</span></td>
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

// Get Status Text
function getStatusText(status) {
    switch (status) {
        case 'pending': return 'Bekliyor';
        case 'reviewing': return 'İnceleniyor';
        case 'resolved': return 'Çözüldü';
        case 'rejected': return 'Reddedildi';
        default: return status;
    }
}

// Report Actions
async function reviewReport(reportId) {
    try {
        if (supabase) {
            const { error } = await supabase
                .from('reports')
                .update({ status: 'reviewing' })
                .eq('id', reportId);

            if (!error) {
                showAlert(`Rapor ${reportId.substring(0, 8)} inceleniyor...`, 'info');
                loadModerationData(); // Sayfayı yenile
            } else {
                showAlert('Rapor güncellenirken hata oluştu.', 'danger');
            }
        } else {
            showAlert(`Rapor ${reportId.substring(0, 8)} inceleniyor...`, 'info');
        }
    } catch (error) {
        console.error('Error updating report:', error);
        showAlert('Rapor güncellenirken hata oluştu.', 'danger');
    }
}

async function approveReport(reportId) {
    try {
        if (supabase) {
            const { error } = await supabase
                .from('reports')
                .update({ status: 'resolved' })
                .eq('id', reportId);

            if (!error) {
                showAlert(`Rapor ${reportId.substring(0, 8)} onaylandı.`, 'success');
                loadModerationData(); // Sayfayı yenile
            } else {
                showAlert('Rapor güncellenirken hata oluştu.', 'danger');
            }
        } else {
            showAlert(`Rapor ${reportId.substring(0, 8)} onaylandı.`, 'success');
        }
    } catch (error) {
        console.error('Error updating report:', error);
        showAlert('Rapor güncellenirken hata oluştu.', 'danger');
    }
}

async function rejectReport(reportId) {
    try {
        if (supabase) {
            const { error } = await supabase
                .from('reports')
                .update({ status: 'rejected' })
                .eq('id', reportId);

            if (!error) {
                showAlert(`Rapor ${reportId.substring(0, 8)} reddedildi.`, 'danger');
                loadModerationData(); // Sayfayı yenile
            } else {
                showAlert('Rapor güncellenirken hata oluştu.', 'danger');
            }
        } else {
            showAlert(`Rapor ${reportId.substring(0, 8)} reddedildi.`, 'danger');
        }
    } catch (error) {
        console.error('Error updating report:', error);
        showAlert('Rapor güncellenirken hata oluştu.', 'danger');
    }
}

// Load Strikes Data
async function loadStrikesData() {
    try {
        if (supabase) {
            // İkaz istatistiklerini yükle
            const [totalStrikes, activeStrikes, level1Strikes, level2Strikes, level3Strikes] = await Promise.all([
                supabase.from('user_strikes').select('id', { count: 'exact' }),
                supabase.from('user_strikes').select('id', { count: 'exact' }).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
                supabase.from('user_strikes').select('id', { count: 'exact' }).eq('level', 1),
                supabase.from('user_strikes').select('id', { count: 'exact' }).eq('level', 2),
                supabase.from('user_strikes').select('id', { count: 'exact' }).eq('level', 3)
            ]);

            // İstatistikleri güncelle
            updateStrikesStats({
                total: totalStrikes.count || 0,
                active: activeStrikes.count || 0,
                level1: level1Strikes.count || 0,
                level2: level2Strikes.count || 0,
                level3: level3Strikes.count || 0
            });

            // İkazları yükle
            const { data, error } = await supabase
                .from('user_strikes')
                .select(`
                    *,
                    user:users!user_strikes_user_id_fkey(name, email)
                `)
                .order('created_at', { ascending: false })
                .limit(20);

            if (!error && data) {
                updateStrikesTable(data);
            }
        } else {
            console.log('Supabase not available, using default data');
        }
    } catch (error) {
        console.error('Error loading strikes data:', error);
    }
}

// Update Strikes Stats
function updateStrikesStats(stats) {
    // İkaz istatistik kartlarını güncelle
    const totalCard = document.querySelector('#strikesPage .col-md-3:nth-child(1) .card-body h3');
    const activeCard = document.querySelector('#strikesPage .col-md-3:nth-child(2) .card-body h3');
    const level1Card = document.querySelector('#strikesPage .col-md-3:nth-child(3) .card-body h3');
    const level2Card = document.querySelector('#strikesPage .col-md-3:nth-child(4) .card-body h3');

    if (totalCard) totalCard.textContent = stats.total;
    if (activeCard) activeCard.textContent = stats.active;
    if (level1Card) level1Card.textContent = stats.level1;
    if (level2Card) level2Card.textContent = stats.level2;
}

// Update Strikes Table
function updateStrikesTable(strikes) {
    const tbody = document.getElementById('strikesTable');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    strikes.forEach(strike => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${strike.id.substring(0, 8)}</td>
            <td>${strike.user?.name || strike.user_id}</td>
            <td>${strike.reason}</td>
            <td><span class="badge badge-${getStrikeLevelColor(strike.level)}">Seviye ${strike.level}</span></td>
            <td>${formatDate(strike.created_at)}</td>
            <td>
                <button class="btn btn-sm btn-warning me-1" onclick="escalateStrike('${strike.id}')">Yükselt</button>
                <button class="btn btn-sm btn-danger" onclick="removeStrike('${strike.id}')">Kaldır</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Get Strike Level Color
function getStrikeLevelColor(level) {
    switch (level) {
        case 1: return 'warning';
        case 2: return 'danger';
        case 3: return 'dark';
        default: return 'secondary';
    }
}

// Load Users Data
async function loadUsersData() {
    try {
        if (supabase) {
            // Kullanıcı istatistiklerini yükle
            const [totalUsers, activeUsers, bannedUsers] = await Promise.all([
                supabase.from('users').select('id', { count: 'exact' }),
                supabase.from('users').select('id', { count: 'exact' }).eq('is_active', true),
                supabase.from('users').select('id', { count: 'exact' }).eq('is_active', false)
            ]);

            // İstatistikleri güncelle
            updateUsersStats({
                total: totalUsers.count || 0,
                active: activeUsers.count || 0,
                banned: bannedUsers.count || 0
            });

            // Kullanıcıları yükle
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (!error && data) {
                updateUsersTable(data);
            }
        } else {
            console.log('Supabase not available, using default data');
        }
    } catch (error) {
        console.error('Error loading users data:', error);
    }
}

// Update Users Stats
function updateUsersStats(stats) {
    // Kullanıcı istatistik kartlarını güncelle
    const totalCard = document.querySelector('#usersPage .col-md-3:nth-child(1) .card-body h3');
    const activeCard = document.querySelector('#usersPage .col-md-3:nth-child(2) .card-body h3');
    const bannedCard = document.querySelector('#usersPage .col-md-3:nth-child(3) .card-body h3');

    if (totalCard) totalCard.textContent = stats.total;
    if (activeCard) activeCard.textContent = stats.active;
    if (bannedCard) bannedCard.textContent = stats.banned;
}

// Update Users Table
function updateUsersTable(users) {
    const tbody = document.getElementById('usersTable');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td><span class="badge badge-${user.is_active ? 'success' : 'danger'}">${user.is_active ? 'Aktif' : 'Yasaklı'}</span></td>
            <td>${formatDate(user.created_at)}</td>
            <td>${user.last_login ? formatDate(user.last_login) : 'Hiç'}</td>
            <td>
                <button class="btn btn-sm btn-info me-1" onclick="viewUser('${user.id}')">Görüntüle</button>
                <button class="btn btn-sm btn-warning me-1" onclick="toggleUserStatus('${user.id}', ${user.is_active})">${user.is_active ? 'Yasakla' : 'Aktif Et'}</button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">Sil</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load Analytics Data
async function loadAnalyticsData() {
    try {
        if (supabase) {
            // Analitik verilerini yükle
            const [dailyUsers, weeklyUsers, monthlyUsers, totalReports, totalStrikes] = await Promise.all([
                supabase.from('users').select('id', { count: 'exact' }).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
                supabase.from('users').select('id', { count: 'exact' }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
                supabase.from('users').select('id', { count: 'exact' }).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
                supabase.from('reports').select('id', { count: 'exact' }),
                supabase.from('user_strikes').select('id', { count: 'exact' })
            ]);

            // Analitikleri güncelle
            updateAnalyticsStats({
                dailyUsers: dailyUsers.count || 0,
                weeklyUsers: weeklyUsers.count || 0,
                monthlyUsers: monthlyUsers.count || 0,
                totalReports: totalReports.count || 0,
                totalStrikes: totalStrikes.count || 0
            });
        } else {
            console.log('Supabase not available, using default data');
        }
    } catch (error) {
        console.error('Error loading analytics data:', error);
    }
}

// Update Analytics Stats
function updateAnalyticsStats(stats) {
    // Analitik istatistik kartlarını güncelle
    const dailyCard = document.querySelector('#analyticsPage .col-md-3:nth-child(1) .card-body h3');
    const weeklyCard = document.querySelector('#analyticsPage .col-md-3:nth-child(2) .card-body h3');
    const monthlyCard = document.querySelector('#analyticsPage .col-md-3:nth-child(3) .card-body h3');
    const reportsCard = document.querySelector('#analyticsPage .col-md-3:nth-child(4) .card-body h3');

    if (dailyCard) dailyCard.textContent = stats.dailyUsers;
    if (weeklyCard) weeklyCard.textContent = stats.weeklyUsers;
    if (monthlyCard) monthlyCard.textContent = stats.monthlyUsers;
    if (reportsCard) reportsCard.textContent = stats.totalReports;
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
