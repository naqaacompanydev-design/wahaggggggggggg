const drawer=document.getElementById('drawer'),tog=document.querySelector('.nav__actions .nav__toggle');
tog.addEventListener('click',()=>{drawer.classList.add('is-open');tog.setAttribute('aria-expanded','true');document.body.style.overflow='hidden'});
drawer.querySelector('[data-close]').addEventListener('click',()=>{drawer.classList.remove('is-open');tog.setAttribute('aria-expanded','false');document.body.style.overflow=''});
