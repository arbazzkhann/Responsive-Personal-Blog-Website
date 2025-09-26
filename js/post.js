(function(){
	// Storage keys and allowed categories
	let STORAGE_KEY = 'mini_blog_posts_v2';
	let THEME_KEY = 'mini_blog_theme';
	let ALLOWED_CATEGORIES = ['News','Tips','Tutorial','Opinion','Announcement','Other'];

    // Read a query parameter from the URL
    function getParam(name){
        let m = new RegExp('(?:^|&)' + name + '=([^&]*)').exec(window.location.search.slice(1));
        return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
    }
    // Load all posts from LocalStorage
    function loadPosts(){
		try{
			let raw = localStorage.getItem(STORAGE_KEY);
			let parsed = raw ? JSON.parse(raw) : [];
			return Array.isArray(parsed) ? parsed : [];
		}catch(e){ return []; }
	}
    // Persist posts to LocalStorage
    function savePosts(posts){ localStorage.setItem(STORAGE_KEY, JSON.stringify(posts)); }
    // Apply/remove the dark class and remember choice
    function applyTheme(theme){ let root = document.documentElement; if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark'); localStorage.setItem(THEME_KEY, theme); }
    // Initialize theme from saved value or system preference
    function initTheme(){ let saved = localStorage.getItem(THEME_KEY); if (saved === 'dark' || saved === 'light') { applyTheme(saved); return saved; } let prefersDark = false; try { prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch(_){} let initial = prefersDark ? 'dark' : 'light'; applyTheme(initial); return initial; }
    // Ensure category is from the allowed set
    function normalizeCategory(value){ return ALLOWED_CATEGORIES.indexOf(value) !== -1 ? value : 'Other'; }

	document.addEventListener('DOMContentLoaded', function(){
        // Theme toggle wiring
        let themeToggle = document.getElementById('themeToggle');
        let currentTheme = initTheme();
		
		if (themeToggle) themeToggle.addEventListener('click', function(){ 
			currentTheme = currentTheme === 'dark' ? 'light' : 'dark'; applyTheme(currentTheme); 
		});

        // Get current post and key DOM nodes
        let id = Number(getParam('id'));
        let posts = loadPosts();
        let post = posts.find(function(p){ return p.id === id; });
        let titleEl = document.getElementById('postTitle');
        let metaEl = document.getElementById('postMeta');
        let contentEl = document.getElementById('postContent');
        let editBtn = document.getElementById('editBtn');
        let deleteBtn = document.getElementById('deleteBtn');
        let form = document.getElementById('editForm');
        let fId = document.getElementById('postId');
        let fTitle = document.getElementById('title');
        let fCategory = document.getElementById('category');
        let fContent = document.getElementById('content');
        let cancelBtn = document.getElementById('cancelBtn');

        // Render the current post into the page
        function render(){
			posts = loadPosts();
			post = posts.find(function(p){ return p.id === id; });
			if (!post) {
				titleEl.textContent = 'Post not found';
				metaEl.textContent = '';
				contentEl.textContent = '';
				form.hidden = true;
				if (editBtn) editBtn.disabled = true;
				if (deleteBtn) deleteBtn.disabled = true;
				return;
			}
			titleEl.textContent = post.title;
			let date = new Date(post.createdAt);
			metaEl.className = 'post-meta';
			metaEl.innerHTML = '';
			if (post.category) { let badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = post.category; metaEl.appendChild(badge); }
			let dateSpan = document.createElement('span'); dateSpan.textContent = date.toLocaleString(); metaEl.appendChild(dateSpan);
			contentEl.textContent = post.content;
		}

        // Prefill and show the edit form
        function startEdit(){
			if (!post) return;
			fId.value = String(post.id);
			fTitle.value = post.title;
			fCategory.value = normalizeCategory(post.category || 'Other');
			fContent.value = post.content;
			form.hidden = false;
			window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
		}

        // Delete the current post and go back to the list
        function handleDelete(){
			if (!post) return;
			if (!confirm('Delete this post?')) return;
			let next = posts.filter(function(p){ return p.id !== post.id; });
			savePosts(next);
			window.location.href = 'index.html';
		}

        // Save changes from the edit form
        form.addEventListener('submit', function(e){
			e.preventDefault();
			let title = fTitle.value.trim();
			let category = normalizeCategory(fCategory.value);
			let content = fContent.value.trim();
			if (!title || !content) return;
			posts = loadPosts();
			let idx = posts.findIndex(function(p){ return p.id === id; });
			if (idx !== -1) {
				posts[idx].title = title;
				posts[idx].category = category;
				posts[idx].content = content;
				savePosts(posts);
				form.hidden = true;
				render();
			}
		});

        // UI events
        cancelBtn.addEventListener('click', function(){ form.hidden = true; });
        editBtn.addEventListener('click', startEdit);
        deleteBtn.addEventListener('click', handleDelete);

		render();
	});
})();
