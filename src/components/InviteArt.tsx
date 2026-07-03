// 邀请弹窗/落地页共用的暖色头图:礼物盒 + 金币 + 星点。
const Gem = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 4.5h8l3.6 4.6L12 20.5 4.4 9.1z" /></svg>;
const Sparkle = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 7.2L21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8z" /></svg>;

export function InviteArt() {
  return (
    <div className="ihead">
      <div className="iill">
        <span className="ispk is1"><Sparkle /></span>
        <span className="ispk is2"><Sparkle /></span>
        <svg className="igift" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="13" rx="1.5" /><path d="M3 12h18M12 8v13" /><path d="M12 8S10.5 3.5 8 4.2C6 4.8 6.4 8 9 8z" /><path d="M12 8s1.5-4.5 4-3.8C18 4.8 17.6 8 15 8z" /></svg>
        <span className="icoin ic1"><Gem /></span>
        <span className="icoin ic2"><Gem /></span>
      </div>
    </div>
  );
}
