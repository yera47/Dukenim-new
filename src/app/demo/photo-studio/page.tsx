import { ProductPhotoStudio } from "@/components/admin/product-photo-studio";

const product = `<g id="immutable-product"><ellipse cx="300" cy="505" rx="94" ry="18" fill="#3d25311a"/><rect x="235" y="150" width="130" height="330" rx="44" fill="#f7ece7" stroke="#56334d" stroke-width="8"/><rect x="263" y="105" width="74" height="70" rx="18" fill="#56334d"/><rect x="258" y="245" width="84" height="105" rx="14" fill="#fffaf7" stroke="#cfa9bc" stroke-width="4"/><path d="M278 300c18-36 50-28 48 3-2 29-31 39-48 55-17-16-45-26-47-55-2-31 30-39 47-3Z" fill="#9b315d"/><text x="300" y="380" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#56334d">ROSE LAB</text></g>`;
const data = (background:string, decoration="") => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 700"><rect width="600" height="700" fill="${background}"/>${decoration}${product}</svg>`)}`;

export default function PhotoStudioDemoPage() {
  const source = data("#f1eeec");
  const results = [
    { id:"one", label:"Мягкий беж", url:data("#f3e5dc", '<circle cx="500" cy="130" r="150" fill="#d39a7b33"/>') },
    { id:"two", label:"Тёмный градиент", url:data("#ead8e1", '<circle cx="80" cy="620" r="230" fill="#8b2d5533"/>') },
    { id:"three", label:"Светлая студия", url:data("#fffaf5", '<rect x="0" y="525" width="600" height="175" fill="#e7d6cc"/>') },
    { id:"four", label:"Мягкий розовый", url:data("#f8e9ed", '<circle cx="85" cy="110" r="110" fill="#ffffffaa"/><circle cx="535" cy="610" r="160" fill="#b52f6522"/>') },
    { id:"five", label:"Контрастный фон", url:data("#ddd8dc", '<path d="M0 0h600L430 700H0Z" fill="#463642"/>') },
  ];
  return <main style={{maxWidth:1440,margin:"0 auto",padding:"clamp(12px,3vw,40px)"}}>
    <p style={{margin:"0 0 12px",color:"#6d6069",fontSize:13}}>Синтетическая демонстрация: один и тот же векторный товар на разных фонах. Генерация изображений не запускалась.</p>
    <ProductPhotoStudio providerAvailable={false} monthlyLimit={null} creditBalance={90} creditCostPerOutput={1} creditPricingReady demoSource={source} demoResults={results}/>
  </main>;
}
