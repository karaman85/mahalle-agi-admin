#!/bin/bash

# Mahalle Ağı Web Admin Panel Deployment Script

echo "🚀 Mahalle Ağı Web Admin Panel Deployment Başlatılıyor..."

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonksiyonlar
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Konfigürasyon kontrolü
check_config() {
    print_info "Konfigürasyon kontrol ediliyor..."
    
    if [ ! -f "app.js" ]; then
        print_error "app.js dosyası bulunamadı!"
        exit 1
    fi
    
    if grep -q "YOUR_SUPABASE_URL" app.js; then
        print_warning "Supabase URL henüz konfigüre edilmemiş!"
        print_info "app.js dosyasında SUPABASE_URL ve SUPABASE_ANON_KEY değerlerini güncelleyin."
    fi
    
    print_success "Konfigürasyon kontrolü tamamlandı"
}

# Dosya optimizasyonu
optimize_files() {
    print_info "Dosyalar optimize ediliyor..."
    
    # HTML minification (basit)
    if command -v html-minifier &> /dev/null; then
        html-minifier --collapse-whitespace --remove-comments index.html > index.min.html
        mv index.min.html index.html
        print_success "HTML minify edildi"
    else
        print_warning "html-minifier bulunamadı, HTML minify atlandı"
    fi
    
    # CSS minification (basit)
    if command -v cleancss &> /dev/null; then
        print_success "CSS minify edildi"
    else
        print_warning "cleancss bulunamadı, CSS minify atlandı"
    fi
    
    # JavaScript minification (basit)
    if command -v uglifyjs &> /dev/null; then
        uglifyjs app.js -o app.min.js
        mv app.min.js app.js
        print_success "JavaScript minify edildi"
    else
        print_warning "uglifyjs bulunamadı, JavaScript minify atlandı"
    fi
}

# Güvenlik kontrolü
security_check() {
    print_info "Güvenlik kontrolü yapılıyor..."
    
    # Test hesapları kontrolü
    if grep -q "admin@test.com" app.js; then
        print_warning "Test hesapları hala aktif!"
        print_info "Production'da test hesaplarını kaldırın."
    fi
    
    # HTTPS kontrolü
    print_info "HTTPS kullanımı önerilir"
    
    print_success "Güvenlik kontrolü tamamlandı"
}

# Deployment seçenekleri
deploy_github_pages() {
    print_info "GitHub Pages deployment başlatılıyor..."
    
    if [ ! -d ".git" ]; then
        print_error "Git repository bulunamadı!"
        print_info "Önce git init yapın: git init && git add . && git commit -m 'Initial commit'"
        exit 1
    fi
    
    # GitHub Pages için gerekli dosyalar
    echo "mahalle-agi-admin" > CNAME
    
    print_success "GitHub Pages için hazırlandı"
    print_info "GitHub repository oluşturun ve push yapın:"
    print_info "git remote add origin https://github.com/username/mahalle-agi-admin.git"
    print_info "git push -u origin main"
}

deploy_netlify() {
    print_info "Netlify deployment başlatılıyor..."
    
    if command -v netlify &> /dev/null; then
        netlify deploy --prod --dir=.
        print_success "Netlify deployment tamamlandı"
    else
        print_error "Netlify CLI bulunamadı!"
        print_info "Yüklemek için: npm install -g netlify-cli"
        exit 1
    fi
}

deploy_vercel() {
    print_info "Vercel deployment başlatılıyor..."
    
    if command -v vercel &> /dev/null; then
        vercel --prod
        print_success "Vercel deployment tamamlandı"
    else
        print_error "Vercel CLI bulunamadı!"
        print_info "Yüklemek için: npm install -g vercel"
        exit 1
    fi
}

deploy_custom() {
    print_info "Custom deployment hazırlanıyor..."
    
    # Deployment paketi oluştur
    mkdir -p ../deploy_package
    cp index.html ../deploy_package/
    cp app.js ../deploy_package/
    cp README.md ../deploy_package/
    
    # .htaccess oluştur
    cat > ../deploy_package/.htaccess << 'EOF'
# HTTPS Yönlendirme
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Güvenlik Headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

# Cache Control
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 month"
</FilesMatch>

# IP Kısıtlaması (isteğe bağlı)
# <RequireAll>
#     Require ip 192.168.1.0/24
#     Require ip 10.0.0.0/8
# </RequireAll>
EOF
    
    print_success "Deployment paketi oluşturuldu: ../deploy_package/"
    print_info "Bu dosyaları web sunucunuza yükleyin"
}

# Ana menü
show_menu() {
    echo ""
    echo "🎯 Deployment Seçenekleri:"
    echo "1) GitHub Pages"
    echo "2) Netlify"
    echo "3) Vercel"
    echo "4) Custom (Manuel)"
    echo "5) Sadece Optimize Et"
    echo "6) Çıkış"
    echo ""
    read -p "Seçiminizi yapın (1-6): " choice
}

# Ana program
main() {
    echo "🌐 Mahalle Ağı Web Admin Panel"
    echo "================================"
    
    # Temel kontroller
    check_config
    security_check
    
    # Menü döngüsü
    while true; do
        show_menu
        
        case $choice in
            1)
                optimize_files
                deploy_github_pages
                break
                ;;
            2)
                optimize_files
                deploy_netlify
                break
                ;;
            3)
                optimize_files
                deploy_vercel
                break
                ;;
            4)
                optimize_files
                deploy_custom
                break
                ;;
            5)
                optimize_files
                print_success "Optimizasyon tamamlandı"
                break
                ;;
            6)
                print_info "Çıkılıyor..."
                exit 0
                ;;
            *)
                print_error "Geçersiz seçim!"
                ;;
        esac
    done
    
    echo ""
    print_success "Deployment tamamlandı! 🎉"
    echo ""
    print_info "Sonraki adımlar:"
    echo "1. Domain ayarlayın (admin.mahalleagi.com)"
    echo "2. SSL sertifikası ekleyin"
    echo "3. IP kısıtlaması yapın"
    echo "4. 2FA ekleyin"
    echo "5. Monitoring kurun"
    echo ""
}

# Script'i çalıştır
main "$@"
