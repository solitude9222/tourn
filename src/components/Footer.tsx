import {DiscordIcon} from './Icons';
import '../footer.css';
export function Footer({onSignIn,onSignUp,onFaq}:{onSignIn:()=>void;onSignUp:()=>void;onFaq:()=>void}){
 return <footer className="hm-footer" aria-label="Site footer"><div className="hm-wrap"><div className="hm-footer-top">
 <div className="hm-footer-brand"><a className="hm-footer-logo" href="#/" aria-label="Tourn home"><img src="/brand/tourn-mark.svg" alt="" width="28" height="28"/>tourn<span>.</span>lol</a><p>Your links, interests and communities. One place that feels like you.</p><div className="hm-footer-account"><button type="button" onClick={onSignUp}>Create account</button><button type="button" onClick={onSignIn}>Sign in</button></div></div>
 <nav className="hm-footer-col" aria-label="Explore Tourn"><h2>Explore</h2><a href="#/premium">Pricing</a><a href="#/leaderboard">Leaderboard</a><a href="#/shop">Marketplace</a><a href="#/demo">Profile demo</a></nav>
 <nav className="hm-footer-col" aria-label="Help and resources"><h2>Resources</h2><button type="button" className="hm-footer-link" onClick={onFaq}>Help & FAQ</button><a href="mailto:hello@tourn.lol">Contact support</a><a href="#/legal/privacy">Privacy</a><a href="#/legal/terms">Terms of service</a></nav>
 <div className="hm-footer-community"><h2>Stay connected</h2><p>Get help, share your profile and hear what’s new.</p><a className="hm-footer-discord" href="https://discord.gg/a9uwptuepD" target="_blank" rel="noopener noreferrer"><DiscordIcon size={18}/>Join our Discord<span aria-hidden="true">↗</span></a></div>
 </div><div className="hm-footer-bottom"><span>© {new Date().getFullYear()} tourn.lol</span><nav aria-label="Legal links"><a href="#/legal/terms">Terms</a><a href="#/legal/privacy">Privacy</a><a href="#/legal/cookies">Cookies</a><a href="#top" onClick={event=>{event.preventDefault();window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}}>Back to top ↑</a></nav></div></div></footer>;
}
