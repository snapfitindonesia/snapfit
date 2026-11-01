'use client';

/* Desain dari paket "FashionPage" (markup & CSS Modules dipertahankan) — dipasang sebagai halaman /buy1get1.
   Yang diubah dari paket: logo → SNAPFIT, banner → dari dashboard (placeholder bila kosong), menu → kategori
   asli SNAPFIT (lib/promo-page/menu.ts), tombol → fitur website (keranjang, akun, pencarian, newsletter),
   urutan/tampil bagian & semua teks → Admin → Halaman Buy 1 Get 1 (lib/promo-page/config.ts). */
/* eslint-disable @next/next/no-img-element -- markup paket: <img> biasa (banner data URI/CDN tanpa next/image). */
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import type { IconName } from './Icon';
import styles from './PromoPage.module.css';
import { placeholder, SLOT_SIZE, type PromoPageConfig, type SectionKey } from '@/lib/promo-page/config';
import type { PromoMenu, MenuSegment } from '@/lib/promo-page/menu';

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).map(name => styles[name as string]).filter(Boolean).join(' ');
type BottomItem = 'home' | 'category' | 'cart' | 'wishlist' | 'account';
export type PromoAction = 'cart' | 'wishlist' | 'account' | 'app' | 'returns' | 'help';
export interface PromoPageProps {
  config: PromoPageConfig;
  menu: PromoMenu;
  /** Logo SNAPFIT (wordmark) & ikon "S" (pengganti huruf Z paket). */
  logoSrc: string;
  markSrc: string;
  /** The dedicated page route, not the main website homepage. */
  homeHref: string;
  /** Kartu produk promo (dirender server) — tampil di bagian "products". */
  products?: ReactNode;
  /** Pindah halaman (router Next) — `#id` digulir di halaman ini. */
  navigate: (href: string) => void;
  /** Tombol keranjang/akun/dll. → fitur website. false = tampilkan info lokal. */
  onAction?: (action: PromoAction) => boolean;
  onNewsletterSubmit?: (email: string) => void | Promise<void>;
  /** Drawer keranjang / login toko sedang terbuka → menu bawah & tombol bantuan disembunyikan (tak menutupi). */
  overlayOpen?: boolean;
}
type ModalState = { kind: 'info' | 'newsletter'; title: string; action?: BottomItem };

const categoryIcons: Record<string, string> = { Rekomendasi: '✧' };

function Modal({ title, eyebrow, className, children, onClose }: { title: string; eyebrow: string; className: string; children: ReactNode; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={dialogRef} className={className} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }}>
    <div className={cx('dialog-top')}><span className={cx('eyebrow')}>{eyebrow}</span><button className={cx('icon-button')} aria-label="Tutup" onClick={onClose}><Icon name="close" className={cx('icon')}/></button></div>
    <h2 id={titleId}>{title}</h2>{children}
  </dialog>;
}

export default function PromoPage({ config, menu, logoSrc, markSrc, homeHref, products, navigate, onAction, onNewsletterSubmit, overlayOpen = false }: PromoPageProps) {
  const segments = menu.segments;
  const uid = useId();
  const menuId = `${uid}-menu`, panelId = `${uid}-panel`, searchId = `${uid}-search`, suggestionsId = `${uid}-suggestions`, mainId = `${uid}-main`;
  const [mounted, setMounted] = useState(false), [mobile, setMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false), [segmentId, setSegmentId] = useState<string>(segments[0]?.id ?? '');
  const [category, setCategory] = useState('Rekomendasi'), [query, setQuery] = useState(''), [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [appBannerVisible, setAppBannerVisible] = useState(true), [seoExpanded, setSeoExpanded] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null), [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const headerRef = useRef<HTMLElement>(null), searchRef = useRef<HTMLFormElement>(null), searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null), menuCloseRef = useRef<HTMLButtonElement>(null), bottomCategoryRef = useRef<HTMLButtonElement>(null);
  const segmentRefs = useRef<Partial<Record<string, HTMLButtonElement | null>>>({});
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]), suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null), mainRef = useRef<HTMLElement>(null), footerRef = useRef<HTMLElement>(null);
  const activeSegment: MenuSegment = segments.find(segment => segment.id === segmentId) ?? segments[0] ?? { id: '', label: '', href: '/produk', image: '', caption: '', categories: [], seriesTitle: '', series: [] };
  const categories = activeSegment.categories.map(c => c.name);
  const activeCategory = activeSegment.categories.find(c => c.name === category) ?? activeSegment.categories[0];
  const groups = activeCategory?.groups ?? [];
  const activeBottom: BottomItem = menuOpen ? 'category' : modal?.action ?? 'home';
  const segmentImage = (segment: MenuSegment) => segment.image || placeholder(SLOT_SIZE.category[0], SLOT_SIZE.category[1], segment.label);
  const clearCloseTimer = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  const closeMenu = (restoreFocus = false) => {
    clearCloseTimer(); setMenuOpen(false);
    if (restoreFocus) requestAnimationFrame(() => (mobile ? bottomCategoryRef.current : segmentRefs.current[segmentId])?.focus({ preventScroll: true }));
  };
  const openMenu = (id: string, focus = false) => {
    clearCloseTimer(); setSuggestionsOpen(false); setSegmentId(id); setCategory('Rekomendasi'); setMenuOpen(true);
    if (focus || mobile) requestAnimationFrame(() => (mobile ? menuCloseRef.current : tabRefs.current[0])?.focus({ preventScroll: true }));
  };
  const scheduleClose = () => { if (!mobile) { clearCloseTimer(); closeTimer.current = setTimeout(() => setMenuOpen(false), 180); } };
  const chooseCategory = (name: string) => { setCategory(name); if (contentRef.current) contentRef.current.scrollTop = 0; };

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia('(max-width: 800px)');
    setMobile(media.matches);
    const change = () => { setMobile(media.matches); setMenuOpen(false); };
    media.addEventListener('change', change);
    return () => { media.removeEventListener('change', change); if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, []);
  useEffect(() => {
    if (!menuOpen && !modal) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [menuOpen, modal]);
  useEffect(() => {
    const nodes = [mainRef.current, footerRef.current];
    const previous = nodes.map(node => node?.inert ?? false);
    nodes.forEach(node => { if (node) node.inert = menuOpen; });
    return () => nodes.forEach((node, index) => { if (node) node.inert = previous[index]; });
  }, [menuOpen]);
  useEffect(() => {
    const pointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as Node;
      if (menuOpen && !headerRef.current?.contains(target) && !menuRef.current?.contains(target)) setMenuOpen(false);
      if (!searchRef.current?.contains(target)) setSuggestionsOpen(false);
    };
    const keyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (menuOpen) { event.preventDefault(); closeMenu(true); }
      setSuggestionsOpen(false);
    };
    document.addEventListener('pointerdown', pointerDown);
    document.addEventListener('keydown', keyDown);
    return () => { document.removeEventListener('pointerdown', pointerDown); document.removeEventListener('keydown', keyDown); };
    // closeMenu reads the current responsive mode and segment to restore focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen, mobile, segmentId]);

  /** Tujuan tombol: `#id` → gulir di halaman ini; selain itu → halaman website. */
  const go = (href: string) => {
    closeMenu(); setSuggestionsOpen(false); setModal(null);
    if (!href) return;
    if (href.startsWith('#')) {
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    navigate(href);
  };
  const showInfo = (key: PromoAction) => {
    closeMenu(); setSuggestionsOpen(false);
    if (onAction?.(key)) return;
    const titles = { cart: 'Keranjang', wishlist: 'Wishlist', account: 'Akun', app: 'Aplikasi', returns: 'Pengembalian', help: 'Bantuan' };
    setModal({ kind: 'info', title: titles[key], action: key === 'cart' || key === 'wishlist' || key === 'account' ? key : undefined });
  };
  const submitSearch = (event?: FormEvent, term = query) => {
    event?.preventDefault(); const value = term.trim();
    if (!value) { searchInputRef.current?.focus(); setSuggestionsOpen(true); return; }
    const hit = menu.suggestions.find(s => s.label.toLowerCase() === value.toLowerCase());
    go(hit?.href ?? `/produk?q=${encodeURIComponent(value)}`);
  };
  const homeClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (window.location.pathname.replace(/\/$/, '') !== new URL(homeHref, window.location.href).pathname.replace(/\/$/, '')) return;
    event.preventDefault(); closeMenu(); setModal(null); setSuggestionsOpen(false);
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  const q = query.trim().toLowerCase();
  const suggestions = menu.suggestions.filter(item => item.label.toLowerCase().includes(q)).slice(0, 5);
  const displayedSuggestions = suggestions.length ? suggestions : [{ label: query.trim(), href: `/produk?q=${encodeURIComponent(query.trim())}` }];
  const tabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? categories.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + categories.length) % categories.length;
    chooseCategory(categories[next]); tabRefs.current[next]?.focus();
  };
  const homeIcon = <img src={markSrc} alt="" className={cx('icon', 'mark')}/>;
  const bottomNavigation = <nav className={cx('mobile-bottom-nav')} aria-label="Navigasi bawah">
    {(['home', 'category', 'cart', 'wishlist', 'account'] as BottomItem[]).map(key => {
      const label = { home: 'Home', category: 'Kategori', cart: 'Tas', wishlist: 'Wishlist', account: 'Akun Saya' }[key];
      const iconName: IconName = { home: 'z', category: 'grid', cart: 'bag', wishlist: 'heart', account: 'user' }[key] as IconName;
      const inner = <>{key === 'home' ? homeIcon : <Icon name={iconName} className={cx('icon')}/>}<span>{label}</span></>;
      return key === 'home' ? <a key={key} className={cx('bottom-nav-item')} href={homeHref} onClick={homeClick} aria-current={activeBottom === key ? 'page' : undefined}>{inner}</a>
        : <button key={key} ref={key === 'category' ? bottomCategoryRef : undefined} className={cx('bottom-nav-item')} aria-current={activeBottom === key ? 'page' : undefined} aria-controls={key === 'category' ? menuId : undefined} aria-expanded={key === 'category' ? menuOpen : undefined} onClick={() => key === 'category' ? menuOpen ? menuCloseRef.current?.focus() : openMenu(segmentId) : showInfo(key)}>{inner}</button>;
    })}
  </nav>;
  const menuPanel = <div ref={menuRef} id={menuId} className={cx('mega-menu', 'header-width')} hidden={!menuOpen} role={mobile ? 'dialog' : 'region'} aria-modal={mobile && menuOpen ? true : undefined} aria-label="Pilihan kategori" onPointerEnter={clearCloseTimer} onPointerLeave={scheduleClose} onKeyDown={event => {
    if (!mobile || event.key !== 'Tab') return;
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]')].filter(element => element.getClientRects().length > 0);
    if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
    else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0]?.focus(); }
  }}>
    <div className={cx('mega-heading')}><div className={cx('mega-title')}><h2>{activeSegment.label}</h2><button className={cx('text-link')} onClick={() => go(activeSegment.href)}>Lihat semua <span>↗</span></button></div><button ref={menuCloseRef} className={cx('icon-button')} aria-label="Tutup menu" onClick={() => closeMenu(true)}><Icon name="close" className={cx('icon')}/></button></div>
    <div className={cx('mobile-segment-strip')} aria-label="Pilih segmen">{segments.map(segment => <button key={segment.id} className={cx(segment.id === segmentId && 'active')} aria-pressed={segment.id === segmentId} onClick={() => openMenu(segment.id)}>{segment.label}</button>)}</div>
    <div className={cx('mega-body')}><div className={cx('category-sidebar')} role="tablist" aria-label="Kelompok kategori" aria-orientation="vertical">{categories.map((name, index) => <button key={name} id={`${uid}-tab-${index}`} ref={element => { tabRefs.current[index] = element; }} role="tab" className={cx('category-tab', name === 'Sale' && 'sale')} aria-controls={panelId} aria-selected={category === name} tabIndex={category === name ? 0 : -1} onKeyDown={event => tabKeyDown(event, index)} onClick={() => chooseCategory(name)}><span className={cx('tab-icon')} aria-hidden="true">{categoryIcons[name] ?? '◌'}</span><span>{name}</span><span className={cx('tab-arrow')} aria-hidden="true">›</span></button>)}</div>
    <div ref={contentRef} id={panelId} className={cx('mega-content')} role="tabpanel" tabIndex={0} aria-labelledby={`${uid}-tab-${categories.indexOf(category)}`}><div className={cx('menu-columns')}>
      {groups.slice(0, 2).map((entry, index) => <div key={entry.title} className={cx('menu-column')}><div className={cx('menu-group')}><h3>{entry.title}{entry.isNew && <span className={cx('new-label')}>NEW</span>}</h3>{entry.links.map(link => <button key={link.label} onClick={() => go(link.href)}>{link.label}</button>)}</div>{index === 0 && <div className={cx('menu-group')}><h3>Shop all</h3><button onClick={() => go(activeCategory?.href ?? activeSegment.href)}>Lihat semua {category === 'Rekomendasi' ? activeSegment.label : category} ↗</button></div>}</div>)}
      <div className={cx('menu-brands')}><h3>{activeSegment.seriesTitle}</h3>{activeSegment.series.map(link => <button key={link.label} onClick={() => go(link.href)}>{link.label}</button>)}<button className={cx('all-brands')} onClick={() => go(activeSegment.href)}>Lihat semua {activeSegment.label} ↗</button></div>
      <button className={cx('menu-editorial')} onClick={() => go(activeSegment.href)}><img src={segmentImage(activeSegment)} alt={`Aksesori ${activeSegment.label}`} width={410} height={490}/><span className={cx('editorial-caption')}><span><strong>SNAPFIT untuk {activeSegment.label}</strong>{activeSegment.caption}</span><span>↗</span></span></button>
    </div></div></div>
    <div className={cx('mega-footer')}><span><Icon name="check" className={cx('icon', 'small')}/>100% produk original</span><span>Aksesori presisi untuk perangkatmu.</span></div>
    {mobile && bottomNavigation}
  </div>;

  const information = modal?.action === 'cart' ? 'Keranjangmu masih kosong. Jelajahi produk promo untuk mulai belanja.' : modal?.action === 'wishlist' ? 'Fitur wishlist segera hadir. Sementara ini, masukkan produk favoritmu ke keranjang.' : modal?.action === 'account' ? 'Masuk ke akun SNAPFIT untuk melihat pesanan & koin.' : 'Butuh bantuan memilih tipe yang pas? Hubungi kami lewat WhatsApp atau lihat halaman bantuan.';
  const modalContent = modal && <Modal title={modal.title} eyebrow="SNAPFIT · BUY 1 GET 1" className={cx('info-dialog')} onClose={() => setModal(null)}>
    {modal.kind === 'newsletter' ? <>{newsletterStatus === 'success' ? <p className={cx('text-success')}>Terima kasih, pendaftaran berhasil.</p> : <form className={cx('newsletter-form')} onSubmit={async event => {
        event.preventDefault(); const email = new FormData(event.currentTarget).get('email') as string; setNewsletterStatus('pending');
        try { await onNewsletterSubmit?.(email); setNewsletterStatus('success'); } catch { setNewsletterStatus('error'); }
      }}><p>{config.signup.text}</p><label htmlFor={`${uid}-email`}>Alamat email</label><input id={`${uid}-email`} name="email" type="email" placeholder="nama@email.com" required autoComplete="email" disabled={newsletterStatus === 'pending'}/>{newsletterStatus === 'error' && <p role="alert">Pendaftaran belum berhasil. Silakan coba lagi.</p>}<button className={cx('pill-button')} type="submit" disabled={newsletterStatus === 'pending'}>{newsletterStatus === 'pending' ? 'Memproses…' : 'Berlangganan'} <span>↗</span></button></form>}</>
      : <><p>{information}</p><button className={cx('pill-button')} onClick={() => go(modal.action === 'account' ? '/masuk' : modal.action === undefined ? '/bantuan' : '#produk-promo')}>{modal.action === 'account' ? 'Masuk' : modal.action === undefined ? 'Buka bantuan' : 'Lihat produk promo'} <span>↗</span></button></>}
  </Modal>;

  // Judul utama (h1) = bagian produk promo / kategori yang tampil PALING ATAS (satu h1 per halaman).
  const active = config.sections.filter(s => s.active).map(s => s.key);
  const h1Key = active.find(k => k === 'products' || k === 'categories');
  const banner = (b: { image: string; alt: string }, slot: 'hero' | 'arrivals' | 'editorial', label: string) => b.image || placeholder(SLOT_SIZE[slot][0], SLOT_SIZE[slot][1], label);
  const Heading = ({ k, id, children }: { k: SectionKey; id: string; children: ReactNode }) => k === h1Key ? <h1 id={id}>{children}</h1> : <h2 id={id}>{children}</h2>;
  const section = (key: SectionKey): ReactNode => {
    switch (key) {
      case 'hero': return <section key={key} className={cx('hero')} aria-label={config.hero.alt || 'Promo'}><button className={cx('image-link')} onClick={() => go(config.hero.href)}><img src={banner(config.hero, 'hero', 'Banner utama')} alt={config.hero.alt} width={1280} height={720} fetchPriority="high"/></button></section>;
      case 'arrivals': return <section key={key} className={cx('arrivals')} aria-label={config.arrivals.alt || 'Banner'}><button className={cx('image-link', 'rounded')} onClick={() => go(config.arrivals.href)}><img src={banner(config.arrivals, 'arrivals', 'Banner strip')} alt={config.arrivals.alt} width={1920} height={300} loading="lazy"/></button></section>;
      case 'products': return <section key={key} id="produk-promo" className={cx('category-section', 'products-section')} aria-labelledby={`${uid}-products`}><div className={cx('section-heading')}><div><span className={cx('eyebrow')}>{config.products.eyebrow}</span><Heading k={key} id={`${uid}-products`}>{config.products.title}</Heading></div><span className={cx('section-caption')}>{config.products.caption}</span></div>{products ?? <p className={cx('products-empty')}>Produk promo segera hadir.</p>}</section>;
      case 'categories': return <section key={key} className={cx('category-section')} aria-labelledby={`${uid}-categories`}><div className={cx('section-heading')}><div><span className={cx('eyebrow')}>{config.categories.eyebrow}</span><Heading k={key} id={`${uid}-categories`}>{config.categories.title}</Heading></div><span className={cx('section-caption')}>{config.categories.caption}</span></div><div className={cx('category-grid')}>{segments.slice(0, 6).map(segment => <button key={segment.id} className={cx('category-card')} aria-label={`Jelajahi ${segment.label}`} onClick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); openMenu(segment.id, true); }}><img src={segmentImage(segment)} alt={`Aksesori ${segment.label}`} width={410} height={490} loading="lazy"/><span className={cx('category-arrow')} aria-hidden="true">↗</span></button>)}</div></section>;
      case 'editorial': return <section key={key} className={cx('editorial')} aria-label={config.editorial.alt || 'Editorial'}><button className={cx('image-link', 'rounded')} onClick={() => go(config.editorial.href)}><img src={banner(config.editorial, 'editorial', 'Banner editorial')} alt={config.editorial.alt} width={1280} height={480} loading="lazy"/></button></section>;
      case 'brands': return <section key={key} className={cx('brands-section')} aria-labelledby={`${uid}-brands`}><div className={cx('section-heading')}><div><span className={cx('eyebrow')}>{config.brands.eyebrow}</span><h2 id={`${uid}-brands`}>{config.brands.title}</h2></div>{config.brands.linkLabel && <button className={cx('underlined-link')} onClick={() => go(config.brands.linkHref)}>{config.brands.linkLabel} <span>↗</span></button>}</div><div className={cx('brand-grid')}>{config.brands.items.slice(0, 6).map((item, index) => <button key={index} className={cx('brand-card')} aria-label={`Jelajahi ${item.alt}`} onClick={() => go(item.href)}><img src={item.image || placeholder(SLOT_SIZE.brand[0], SLOT_SIZE.brand[1], item.alt)} alt={item.alt} width={380} height={380} loading="lazy"/></button>)}</div></section>;
      case 'signup': return <section key={key} className={cx('signup-banner')}><div><span className={cx('eyebrow')}>{config.signup.eyebrow}</span><h2>{config.signup.title}</h2><p>{config.signup.text}</p></div><button className={cx('pill-button')} onClick={() => { setNewsletterStatus('idle'); setModal({ kind: 'newsletter', title: 'Newsletter' }); }}>{config.signup.ctaLabel} <span>↗</span></button></section>;
      case 'benefits': return <section key={key} className={cx('benefits')} aria-label="Keunggulan berbelanja">{config.benefits.map((benefit, index) => <div key={index}><Icon name={(['check', 'truck', 'return'] as IconName[])[index] ?? 'check'} className={cx('icon')}/><span><strong>{benefit.title}</strong><small>{benefit.caption}</small></span></div>)}</section>;
      case 'seo': return <section key={key} className={cx('seo-block')}><h2>{config.seo.title}</h2><p>{config.seo.text}</p>{seoExpanded && config.seo.more && <p>{config.seo.more}</p>}{config.seo.more && <button className={cx('underlined-link')} aria-expanded={seoExpanded} onClick={() => setSeoExpanded(value => !value)}>{seoExpanded ? 'Tampilkan lebih sedikit' : 'Baca selengkapnya'} <span>{seoExpanded ? '−' : '+'}</span></button>}</section>;
    }
  };

  return <div className={cx('root', 'page')}>
    <a className={cx('skip-link')} href={`#${mainId}`}>Lewati ke konten</a>
    {config.appBanner.show && appBannerVisible && <div className={cx('mobile-app-banner')}><button className={cx('app-banner-close')} aria-label="Tutup banner" onClick={() => setAppBannerVisible(false)}><Icon name="close" className={cx('icon')}/></button><span className={cx('app-logo')} aria-hidden="true"><img src={markSrc} alt=""/></span><span className={cx('app-banner-copy')}>{config.appBanner.text}</span><button className={cx('app-banner-cta')} onClick={() => go(config.appBanner.href)}>{config.appBanner.ctaLabel}</button></div>}
    <div className={cx('utility')}><div className={cx('header-width')}><button className={cx('utility-link')} onClick={() => go(config.utility.href)}><span className={cx('return-symbol')}>{config.utility.badge}</span>{config.utility.text} <span className={cx('muted')}>| {config.utility.note}</span><span className={cx('chevron')}>›</span></button><button className={cx('utility-link')} onClick={() => go(config.utility.rightHref)}><Icon name="phone" className={cx('icon')}/>{config.utility.rightText} <span className={cx('chevron')}>›</span></button></div></div>
    <header ref={headerRef} className={cx('site-header')} onPointerEnter={clearCloseTimer} onPointerLeave={scheduleClose}>
      <div className={cx('header-main', 'header-width')} onPointerEnter={event => { if (event.pointerType === 'mouse' && !mobile && menuOpen) closeMenu(); }}>
        <a className={cx('wordmark')} href={homeHref} aria-label="SNAPFIT — Buy 1 Get 1" onClick={homeClick}><img src={logoSrc} alt="SNAPFIT"/></a>
        <form ref={searchRef} className={cx('search')} role="search" onSubmit={event => submitSearch(event)}><label className={cx('sr-only')} htmlFor={searchId}>Cari produk</label><input ref={searchInputRef} id={searchId} value={query} onChange={event => { setQuery(event.target.value); setSuggestionsOpen(true); }} onFocus={() => { closeMenu(); setSuggestionsOpen(true); }} placeholder={config.searchPlaceholder} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={suggestionsOpen} aria-controls={suggestionsId} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); suggestionRefs.current[0]?.focus(); } }}/><button className={cx('search-submit')} aria-label="Cari"><Icon name="search" className={cx('icon')}/></button>
          {suggestionsOpen && <div id={suggestionsId} className={cx('search-suggestions')}><div className={cx('suggestion-heading')}>{query.trim() ? 'HASIL PENCARIAN' : 'PENCARIAN POPULER'}</div>{displayedSuggestions.map((term, index) => <button type="button" key={term.label} ref={element => { suggestionRefs.current[index] = element; }} onClick={() => { setQuery(term.label); go(term.href); }} onKeyDown={event => { if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return; event.preventDefault(); if (event.key === 'ArrowUp' && index === 0) searchInputRef.current?.focus(); else suggestionRefs.current[(index + (event.key === 'ArrowDown' ? 1 : -1) + displayedSuggestions.length) % displayedSuggestions.length]?.focus(); }}><Icon name="search" className={cx('icon')}/>{term.label}<span className={cx('suggestion-arrow')}>↗</span></button>)}</div>}
        </form>
        <div className={cx('header-actions')}><button className={cx('account-button')} onClick={() => showInfo('account')}><Icon name="user" className={cx('icon')}/><span>Masuk / Daftar</span></button><button className={cx('icon-button')} aria-label="Wishlist" onClick={() => showInfo('wishlist')}><Icon name="heart" className={cx('icon')}/></button><button className={cx('icon-button')} aria-label="Keranjang belanja" onClick={() => showInfo('cart')}><Icon name="bag" className={cx('icon')}/></button></div>
      </div>
      <nav className={cx('segment-nav', 'header-width')} aria-label="Kategori utama">{segments.map((segment, index) => <button key={segment.id} ref={element => { segmentRefs.current[segment.id] = element; }} className={cx('segment-button')} aria-expanded={menuOpen && segmentId === segment.id} aria-controls={menuId} onPointerEnter={event => { if (event.pointerType === 'mouse' && !mobile && (!menuOpen || segmentId !== segment.id)) openMenu(segment.id); }} onClick={() => openMenu(segment.id)} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); openMenu(segment.id, true); } else if (['ArrowRight', 'ArrowLeft'].includes(event.key)) { event.preventDefault(); const next = segments[(index + (event.key === 'ArrowRight' ? 1 : -1) + segments.length) % segments.length]; segmentRefs.current[next.id]?.focus(); if (menuOpen) openMenu(next.id); } }}>{segment.label}</button>)}</nav>
      {!mobile && menuPanel}
    </header>
    {menuOpen && <div className={cx('backdrop')} aria-hidden="true" onClick={() => closeMenu()}/>}
    <main ref={mainRef} id={mainId}><div className={cx('campaign-width')}>
      {config.sections.filter(s => s.active).map(s => section(s.key))}
    </div></main>
    <footer ref={footerRef} className={cx('site-footer')}><div className={cx('header-width','footer-inner')}><div><a className={cx('wordmark')} href={homeHref} onClick={homeClick}><img src={logoSrc} alt="SNAPFIT"/></a><p>{config.footer.tagline}</p></div><div><h3>Jelajahi</h3>{segments.slice(0,3).map(segment => <button key={segment.id} onClick={() => { window.scrollTo({top:0,behavior:'instant'}); openMenu(segment.id,true); }}>{segment.label}</button>)}</div><div><h3>Lebih banyak</h3>{[{ label: 'Semua produk', href: '/produk' }, { label: 'Tentang SNAPFIT', href: '/tentang' }, { label: 'Bantuan', href: '/bantuan' }].map(link => <button key={link.label} onClick={() => go(link.href)}>{link.label}</button>)}</div></div><div className={cx('header-width','footer-bottom')}><span>{config.footer.bottomLeft}</span><span>{config.footer.bottomRight}</span></div></footer>
    {!(mobile && menuOpen) && !overlayOpen && bottomNavigation}
    {!overlayOpen && <button className={cx('floating-help')} onClick={() => showInfo('help')} aria-label="Bantuan"><img src={markSrc} alt="" className={cx('mark')}/></button>}
    {mounted && mobile && menuOpen && createPortal(<div className={cx('root','overlay-root')}>{menuPanel}</div>,document.body)}
    {mounted && modalContent && createPortal(<div className={cx('root','overlay-root')}>{modalContent}</div>,document.body)}
  </div>;
}
