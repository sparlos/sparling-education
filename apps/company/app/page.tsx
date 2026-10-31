import { color, palette } from "@repo/tokens";
import { Wordmark } from "@repo/ui/marketing/wordmark";
import Image from "next/image";
import type { CSSProperties } from "react";
import { HopLine } from "../components/hop-line";
import { Monogram } from "../components/monogram";
import { Ornament } from "../components/ornament";
import { PrincipleIcon } from "../components/principle-icon";
import { Puzzle } from "../components/puzzle";
import {
  companyName,
  contactEmail,
  productSiteUrl,
  site,
} from "../content/site";
import styles from "./page.module.css";

// The product band wears the product's own colours, from its tokens.
const productColours = {
  "--product-deep": palette.violet[9],
  "--product-mid": palette.violet[8],
  "--product-line": palette.violet[4],
  "--product-soft": palette.violet[1],
  "--k-ink-inverse": color.brand.onFill,
  "--k-sparkle": color.sparkle,
  "--hop-line": palette.violet[1],
  "--hop-label": palette.violet[1],
  "--hop-accent": color.sparkle,
  "--k-font-heading-stack": '"Plus Jakarta Sans", var(--font-sans)',
} as CSSProperties;

export default function Home() {
  const { masthead, hero, product, principles, about, contact, footer } = site;
  return (
    <>
      <a href="#main" className={styles.skip}>
        {masthead.skipLink}
      </a>

      <header className={styles.masthead}>
        <a href="/" className={styles.home}>
          <Monogram />
          <span className={styles.companyName}>{companyName}</span>
        </a>
      </header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <h1 id="hero-title" className={styles.heroTitle}>
            {hero.title}
          </h1>
          <p className={styles.lead}>{hero.lead}</p>
          <a href={hero.action.href} className={styles.heroLink}>
            {hero.action.label}
          </a>
          <Puzzle className={styles.heroFigure} />
        </section>

        <section
          id="product"
          className={styles.productBand}
          style={productColours}
          aria-labelledby="product-title"
        >
          <div className={styles.product}>
            <figure className={`${styles.screenshot} ${styles.reveal}`}>
              <Image
                src={product.screenshot.src}
                width={product.screenshot.width}
                height={product.screenshot.height}
                alt={product.screenshot.alt}
                sizes="(max-width: 60rem) 100vw, 32rem"
              />
              <figcaption>{product.screenshot.caption}</figcaption>
              <HopLine className={styles.productFigure} />
            </figure>
            <div className={`${styles.productText} ${styles.reveal}`}>
              <h2 id="product-title">
                <Wordmark size="lg" inverse />
              </h2>
              {product.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <p className={styles.facts}>{product.facts}</p>
              <a href={productSiteUrl} className={styles.productButton}>
                {product.action}
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
              </a>
            </div>
          </div>
        </section>

        <section
          className={styles.principles}
          aria-labelledby="principles-title"
        >
          <h2 id="principles-title" className={styles.sectionTitle}>
            {principles.title}
          </h2>
          <div className={styles.columns}>
            {principles.items.map((item) => (
              <div
                key={item.title}
                className={`${styles.principle} ${styles.reveal}`}
              >
                <PrincipleIcon name={item.icon} />
                <h3>{item.title}</h3> <p>{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.about} aria-labelledby="about-title">
          <h2 id="about-title" className={styles.visuallyHidden}>
            {about.title}
          </h2>
          <Ornament className={styles.ornament} />
          <p className={`${styles.aboutLead} ${styles.reveal}`}>{about.lead}</p>
          <p className={styles.aboutBody}>{about.body}</p>
          <div className={`${styles.byline} ${styles.reveal}`}>
            <span className={styles.portrait}>
              <Image
                src={about.portrait.src}
                width={about.portrait.width}
                height={about.portrait.height}
                alt=""
                sizes="7rem"
              />
            </span>
            <p className={styles.signature}>{about.signature}</p>
          </div>
        </section>

        <section
          id="contact"
          className={styles.contact}
          aria-labelledby="contact-title"
        >
          <h2 id="contact-title" className={styles.visuallyHidden}>
            {contact.title}
          </h2>
          <p className={styles.contactLead}>{contact.lead}</p>
          <a href={`mailto:${contactEmail}`} className={styles.email}>
            {contactEmail}
          </a>
        </section>
      </main>

      <footer className={styles.footer}>
        <nav aria-label="Footer" className={styles.footerLinks}>
          <a href={productSiteUrl}>{footer.product}</a>
          <a href={`${productSiteUrl}/privacy`}>{footer.privacy}</a>
        </nav>
        <p>
          © {new Date().getFullYear()} {companyName}
        </p>
      </footer>
    </>
  );
}
