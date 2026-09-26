import Link from "next/link";

export default function Home() {
  return (
    <div className="home-shell">
      <section className="home-hero">
        <div className="home-copy">
          <h1>一起投票，<br /><em>积极参与</em></h1>
          <p className="hero-text">发起一场限时投票，把链接分享给大家。匿名参与，投完就能看到当前结果。</p>
          <Link className="button button-primary hero-cta" href="/create">发起投票</Link>
        </div>
      </section>
    </div>
  );
}
