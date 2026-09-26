import Hero from '@/components/Hero';
import HomeToolGrid from '@/components/HomeToolGrid';
import styles from './page.module.css';

export default function Home() {
  return (
    <>
      <Hero />
      <HomeToolGrid />

      {/* Content Section for SEO */}
      <section className={styles.seoSection}>
        <div className="container">
          <h2 className="text-center mb-4">The Best Online PDF Tools</h2>
          <p className="text-center" style={{ maxWidth: '800px', margin: '0 auto' }}>
            We offer a complete collection of PDF tools to help you work with your documents.
            All tools are free to use, without any need for registration or installation.
            Whether you need to merge, split, compress, or convert your files, we have a solution for you.
          </p>
        </div>
      </section>
    </>
  );
}

