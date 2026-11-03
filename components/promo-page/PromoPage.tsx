'use client';

/* Desain dari paket "FashionPage" (markup & CSS Modules dipertahankan) — dipasang sebagai halaman /buy1get1.
   Yang diubah dari paket: logo → SNAPFIT, banner → dari dashboard (placeholder bila kosong), menu → kategori
   SNAPFIT yang punya produk promo saja (lib/promo-page/menu.ts), menu & pencarian → menyaring produk di halaman
   ini (?kat=…&q=…, lib/promo-page/filter.ts), tombol → fitur website (keranjang, akun, newsletter),
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
import { filterHref, matchesFilter, parseFilter, type PromoFilter, type PromoItemMeta } from '@/lib/promo-page/filter';
import type { SectionOf } from '@/lib/home/sections';
import { NewsletterSection } from '@/components/home/newsletter-section';
import { FOOTER_COLUMNS, FooterView, type FooterColumn } from '@/components/shop/footer-view';
import { ProductCard } from '@/components/shop/product-card';
import type { ProductListItem } from '@/lib/actions/product';

/** Produk promo: kartu (dirender server) + data saringnya. */
// Data produk (bukan kartu jadi) → HTML awal hanya memuat PAGE_SIZE kartu; sisanya lewat "Load More Products".
export type PromoProduct = PromoItemMeta & { product: ProductListItem };
const PAGE_SIZE = 12;

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
  /** Produk promo — tampil di bagian "products", disaring menu/pencarian halaman ini. */
  products: PromoProduct[];
  /** Footer = footer halaman utama (langganan email beranda + kartu keunggulan + kolom), kolom "Belanja" → menu promo. */
  newsletter: SectionOf<'newsletter'>;
  /** Pindah halaman (router Next) — `#id` digulir, `?kat=…` menyaring produk di halaman ini. */
  navigate: (href: string) => void;
  /** Tombol keranjang/akun/dll. → fitur website. false = tampilkan info lokal. */
  onAction?: (action: PromoAction) => boolean;
  /** Drawer keranjang / login toko sedang terbuka → menu bawah & tombol bantuan disembunyikan (tak menutupi). */
  overlayOpen?: boolean;
}
type ModalState = { kind: 'info'; title: string; action?: BottomItem };

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

export default function PromoPage({ config, menu, logoSrc, markSrc, homeHref, products, newsletter, navigate, onAction, overlayOpen = false }: PromoPageProps) {
  const segments = menu.segments;
  const uid = useId();
  const menuId = `${uid}-menu`, panelId = `${uid}-panel`, searchId = `${uid}-search`, suggestionsId = `${uid}-suggestions`, mainId = `${uid}-main`;
  const [mounted, setMounted] = useState(false), [mobile, setMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false), [segmentId, setSegmentId] = useState<string>(segments[0]?.id ?? '');
  const [category, setCategory] = useState('Rekomendasi'), [query, setQuery] = useState(''), [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [appBannerVisible, setAppBannerVisible] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [filter, setFilter] = useState<PromoFilter>({});
  const [limit, setLimit] = useState(PAGE_SIZE);
  useEffect(() => setLimit(PAGE_SIZE), [filter.kat, filter.q]); // saringan baru → mulai dari 12 lagi
  const headerRef = useRef<HTMLElement>(null), searchRef = useRef<HTMLFormElement>(null), searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null), menuCloseRef = useRef<HTMLButtonElement>(null), bottomCategoryRef = useRef<HTMLButtonElement>(null);
  const segmentRefs = useRef<Partial<Record<string, HTMLButtonElement | null>>>({});
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]), suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null), mainRef = useRef<HTMLElement>(null), footerRef = useRef<HTMLDivElement>(null);
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
    // Menu/dialog mengunci scroll (overflow hidden) → scrollbar hilang & halaman bergeser saat hover menu.
    // Ruang scrollbar dipertahankan selama di halaman ini.
    const html = document.documentElement, gutter = html.style.scrollbarGutter;
    html.style.scrollbarGutter = 'stable';
    // Saringan dari URL (tautan dibagikan / tombol kembali).
    const readFilter = () => setFilter(parseFilter(window.location.search));
    readFilter();
    // Tautan iklan/bagikan dgn saringan (?kat=galaxy-z-fold-4) → langsung ke daftar produk.
    if (window.location.search.includes('kat=') || window.location.search.includes('q=')) setTimeout(() => scrollToId('produk-promo', false), 150);
    window.addEventListener('popstate', readFilter);
    return () => { html.style.scrollbarGutter = gutter; media.removeEventListener('change', change); window.removeEventListener('popstate', readFilter); if (closeTimer.current) clearTimeout(closeTimer.current); };
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

  // Gulir dgn memperhitungkan header lengket (±121px di desktop) — scrollIntoView biasa tertutup header.
  const scrollToId = (id: string, smooth = true) => {
    const el = document.getElementById(id);
    if (!el) return;
    const header = headerRef.current, sticky = header && ['sticky', 'fixed'].includes(getComputedStyle(header).position);
    const top = el.getBoundingClientRect().top + window.scrollY - (sticky ? header.getBoundingClientRect().height : 0) - 12;
    window.scrollTo({ top, behavior: smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
  };
  /** Tujuan tombol: `?kat=…&q=…` → saring produk promo; `#id` → gulir di halaman ini; selain itu → halaman website. */
  const go = (href: string, scroll = true) => {
    closeMenu(); setSuggestionsOpen(false); setModal(null);
    if (!href) return;
    if (href.startsWith('?')) {
      const next = parseFilter(href);
      setFilter(next);
      const qs = filterHref(next);
      window.history.pushState(null, '', `${window.location.pathname}${qs === '?' ? '' : qs}`);
      if (scroll) requestAnimationFrame(() => scrollToId('produk-promo'));
      return;
    }
    if (href.startsWith('#')) { scrollToId(href.slice(1)); return; }
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
    go(hit?.href ?? filterHref({ q: value }));
  };
  const homeClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (window.location.pathname.replace(/\/$/, '') !== new URL(homeHref, window.location.href).pathname.replace(/\/$/, '')) return;
    event.preventDefault(); closeMenu(); setModal(null); setSuggestionsOpen(false);
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  const q = query.trim().toLowerCase();
  const suggestions = menu.suggestions.filter(item => item.label.toLowerCase().includes(q)).slice(0, 5);
  const displayedSuggestions = suggestions.length ? suggestions : q ? [{ label: query.trim(), href: filterHref({ q: query.trim() }) }] : [];
  const filtering = !!(filter.kat || filter.q);
  const shownProducts = filtering ? products.filter(p => matchesFilter(p, filter)) : products;
  const filterLabel = [filter.kat && (menu.labels[filter.kat] ?? filter.kat), filter.q && `“${filter.q}”`].filter(Boolean).join(' · ');
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
        : <button key={key} ref={key === 'category' ? bottomCategoryRef : undefined} className={cx('bottom-nav-item')} aria-current={activeBottom === key ? 'page' : undefined} aria-controls={key === 'category' ? menuId : undefined} aria-expanded={key === 'category' ? menuOpen : undefined} onClick={() => key === 'category' ? !segments.length ? go('#produk-promo') : menuOpen ? menuCloseRef.current?.focus() : openMenu(segmentId) : showInfo(key)}>{inner}</button>;
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
    <p>{information}</p><button className={cx('pill-button')} onClick={() => go(modal.action === 'account' ? '/masuk' : modal.action === undefined ? '/bantuan' : '#produk-promo')}>{modal.action === 'account' ? 'Masuk' : modal.action === undefined ? 'Buka bantuan' : 'Lihat produk promo'} <span>↗</span></button>
  </Modal>;

  // Judul utama (h1) = judul bagian produk promo (satu h1 per halaman).
  const active = config.sections.filter(s => s.active).map(s => s.key);
  const h1Key = active.find(k => k === 'products');
  const banner = (b: { image: string; alt: string }, slot: 'hero' | 'arrivals', label: string) => b.image || placeholder(SLOT_SIZE[slot][0], SLOT_SIZE[slot][1], label);
  const Heading = ({ k, id, children }: { k: SectionKey; id: string; children: ReactNode }) => k === h1Key ? <h1 id={id}>{children}</h1> : <h2 id={id}>{children}</h2>;
  const section = (key: SectionKey): ReactNode => {
    switch (key) {
      case 'hero': return <section key={key} className={cx('hero')} aria-label={config.hero.alt || 'Promo'}><button className={cx('image-link')} onClick={() => go(config.hero.href)}><img src={banner(config.hero, 'hero', 'Banner utama')} alt={config.hero.alt} width={1280} height={720} fetchPriority="high"/></button></section>;
      case 'arrivals': return <section key={key} className={cx('arrivals')} aria-label={config.arrivals.alt || 'Banner'}><button className={cx('image-link', 'rounded')} onClick={() => go(config.arrivals.href)}><img src={banner(config.arrivals, 'arrivals', 'Banner strip')} alt={config.arrivals.alt} width={1920} height={300} loading="lazy"/></button></section>;
      case 'products': return <section key={key} id="produk-promo" className={cx('category-section', 'products-section')} aria-labelledby={`${uid}-products`}><div className={cx('section-heading')}><div><span className={cx('eyebrow')}>{config.products.eyebrow}</span><Heading k={key} id={`${uid}-products`}>{config.products.title}</Heading></div><span className={cx('section-caption')}>{config.products.caption}</span></div>
        {menu.devices.length > 0 && (() => {
          // Merek aktif: saringan = merek itu sendiri atau salah satu modelnya.
          const active = menu.devices.find(b => b.slug === filter.kat || b.models.some(m => m.slug === filter.kat));
          const chip = (label: string, count: number, slug: string | undefined, on: boolean) => <button key={slug ?? 'all'} type="button" className={cx('device-chip', on && 'active')} aria-pressed={on} onClick={() => go(filterHref({ kat: slug, q: filter.q }), false)}>{label} <small>{count}</small></button>;
          return <div className={cx('device-filter')} role="group" aria-label="Saring menurut perangkat">
            <div className={cx('device-row')}>{chip('Semua', products.length, undefined, !filter.kat)}{menu.devices.map(b => chip(b.label, b.count, b.slug, active?.slug === b.slug))}</div>
            {active && active.models.length > 1 && <div className={cx('device-row', 'models')}>{active.models.map(m => chip(m.label, m.count, m.slug, filter.kat === m.slug))}</div>}
          </div>;
        })()}
        {filtering && <div className={cx('promo-filter')}><span>{shownProducts.length} produk · <strong>{filterLabel}</strong></span><button className={cx('underlined-link')} onClick={() => go('?')}>Semua produk promo <span>×</span></button></div>}
        {shownProducts.length ? <><div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{shownProducts.slice(0, limit).map((p, i) => <div key={p.id}><ProductCard product={p.product} priority={i < 4}/></div>)}</div>
          {shownProducts.length > limit && <div className={cx('load-more')}><span>Menampilkan {limit} dari {shownProducts.length} produk</span><button type="button" className={cx('pill-button')} onClick={() => setLimit(n => n + PAGE_SIZE)}>Load More Products</button></div>}</>
          : <p className={cx('products-empty')}>{filtering ? `Belum ada produk promo untuk ${filterLabel}.` : 'Produk promo segera hadir.'}</p>}
      </section>;
    }
  };

  // Kolom "Belanja" → menu promo (menyaring di halaman ini); Bantuan & SNAPFIT sama dengan footer utama.
  const footerColumns: FooterColumn[] = [
    { title: 'Promo', links: [{ label: 'Semua Produk Promo', href: '?' }, ...segments.slice(0, 6).map(segment => ({ label: segment.label, href: segment.href }))] },
    ...FOOTER_COLUMNS.slice(1),
  ];

  return <>
  <div className={cx('root', 'page')}>
    <a className={cx('skip-link')} href={`#${mainId}`}>Lewati ke konten</a>
    {config.appBanner.show && appBannerVisible && <div className={cx('mobile-app-banner')}><button className={cx('app-banner-close')} aria-label="Tutup banner" onClick={() => setAppBannerVisible(false)}><Icon name="close" className={cx('icon')}/></button><span className={cx('app-logo')} aria-hidden="true"><img src={markSrc} alt=""/></span><span className={cx('app-banner-copy')}>{config.appBanner.text}</span><button className={cx('app-banner-cta')} onClick={() => go(config.appBanner.href)}>{config.appBanner.ctaLabel}</button></div>}
    <div className={cx('utility')}><div className={cx('header-width')}><button className={cx('utility-link')} onClick={() => go(config.utility.href)}><span className={cx('return-symbol')}>{config.utility.badge}</span>{config.utility.text} <span className={cx('muted')}>| {config.utility.note}</span><span className={cx('chevron')}>›</span></button><button className={cx('utility-link')} onClick={() => go(config.utility.rightHref)}><Icon name="phone" className={cx('icon')}/>{config.utility.rightText} <span className={cx('chevron')}>›</span></button></div></div>
    <header ref={headerRef} className={cx('site-header')} onPointerEnter={clearCloseTimer} onPointerLeave={scheduleClose}>
      <div className={cx('header-main', 'header-width')} onPointerEnter={event => { if (event.pointerType === 'mouse' && !mobile && menuOpen) closeMenu(); }}>
        <a className={cx('wordmark')} href={homeHref} aria-label="SNAPFIT — Buy 1 Get 1" onClick={homeClick}><img src={logoSrc} alt="SNAPFIT"/></a>
        <form ref={searchRef} className={cx('search')} role="search" onSubmit={event => submitSearch(event)}><label className={cx('sr-only')} htmlFor={searchId}>Cari produk</label><input ref={searchInputRef} id={searchId} value={query} onChange={event => { setQuery(event.target.value); setSuggestionsOpen(true); }} onFocus={() => { closeMenu(); setSuggestionsOpen(true); }} placeholder={config.searchPlaceholder} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={suggestionsOpen} aria-controls={suggestionsId} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); suggestionRefs.current[0]?.focus(); } }}/><button className={cx('search-submit')} aria-label="Cari"><Icon name="search" className={cx('icon')}/></button>
          {suggestionsOpen && displayedSuggestions.length > 0 && <div id={suggestionsId} className={cx('search-suggestions')}><div className={cx('suggestion-heading')}>{query.trim() ? 'HASIL PENCARIAN' : 'PENCARIAN POPULER'}</div>{displayedSuggestions.map((term, index) => <button type="button" key={term.label} ref={element => { suggestionRefs.current[index] = element; }} onClick={() => { setQuery(term.label); go(term.href); }} onKeyDown={event => { if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return; event.preventDefault(); if (event.key === 'ArrowUp' && index === 0) searchInputRef.current?.focus(); else suggestionRefs.current[(index + (event.key === 'ArrowDown' ? 1 : -1) + displayedSuggestions.length) % displayedSuggestions.length]?.focus(); }}><Icon name="search" className={cx('icon')}/>{term.label}<span className={cx('suggestion-arrow')}>↗</span></button>)}</div>}
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
    {!(mobile && menuOpen) && !overlayOpen && bottomNavigation}
    {!overlayOpen && <button className={cx('floating-help')} onClick={() => showInfo('help')} aria-label="Bantuan"><img src={markSrc} alt="" className={cx('mark')}/></button>}
    {mounted && mobile && menuOpen && createPortal(<div className={cx('root','overlay-root')}>{menuPanel}</div>,document.body)}
    {mounted && modalContent && createPortal(<div className={cx('root','overlay-root')}>{modalContent}</div>,document.body)}
  </div>
  {/* Di luar .root: reset CSS paket (img lebar 100%, font Arial, dll.) tak mengenai footer situs. */}
  <div ref={footerRef} className={cx('site-footer-wrap')}>
    <NewsletterSection s={newsletter}/>
    <FooterView columns={footerColumns} className="mt-0 border-t-0" onLinkClick={href => { if (!href.startsWith('?') && !href.startsWith('#')) return false; go(href); return true; }}/>
  </div>
  </>;
}
