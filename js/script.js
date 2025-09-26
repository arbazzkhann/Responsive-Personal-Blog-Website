document.addEventListener('DOMContentLoaded', function () {
	// DOM - form fields and containers
	let form = document.getElementById('postForm');
	let titleInput = document.getElementById('title');
	let contentInput = document.getElementById('content');
	let categoryInput = document.getElementById('category');
	let hiddenIdInput = document.getElementById('postId');
	let cancelEditBtn = document.getElementById('cancelEditBtn');
	let postsList = document.getElementById('postsList');
	let postsEmpty = document.getElementById('postsEmpty');

	// DOM - toolbar controls
	let searchInput = document.getElementById('searchInput');
	let categoryFilter = document.getElementById('categoryFilter');
	let sortSelect = document.getElementById('sortSelect');
	let exportBtn = document.getElementById('exportBtn');
	let importBtn = document.getElementById('importBtn');
	let importFile = document.getElementById('importFile');
	let clearAllBtn = document.getElementById('clearAllBtn');
	let themeToggle = document.getElementById('themeToggle');

	// Constants
	let STORAGE_KEY = 'mini_blog_posts_v2';
	let THEME_KEY = 'mini_blog_theme';
	let ALLOWED_CATEGORIES = ['News','Tips','Tutorial','Opinion','Announcement','Other'];

	//Load all posts from LocalStorage.
	function loadPosts() {
		try {
			let raw = localStorage.getItem(STORAGE_KEY);
			let parsed = raw ? JSON.parse(raw) : [];
			return Array.isArray(parsed) ? parsed : [];
		} catch (e) {
			console.error('Failed to load posts', e);
			return [];
		}
	}

	//Persist posts array to LocalStorage.
	function savePosts(posts) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
	}

	//Return sorted unique list of categories present in posts.
	function uniqueCategories(posts) {
		let set = {};
		posts.forEach(function (p) {
			if (p.category) set[p.category] = true;
		});
		return Object.keys(set).sort();
	}

	//Populate the category filter with allowed and legacy categories.
	function populateCategoryFilter() {
		let posts = loadPosts();
		let dynamic = uniqueCategories(posts);
		let options = [''].concat(ALLOWED_CATEGORIES);
		let html = options.map(function (c, idx) {
			if (idx === 0) return '<option value="">All categories</option>';
			return '<option value="' + c + '">' + c + '</option>';
		}).join('');
		categoryFilter.innerHTML = html;

		// Ensure filter also shows any legacy categories present in data
		dynamic.forEach(function (c) {
			if (ALLOWED_CATEGORIES.indexOf(c) === -1) {
				let opt = document.createElement('option');
				opt.value = c;
				opt.textContent = c;
				categoryFilter.appendChild(opt);
			}
		});
	}

	//Normalize any category to a known value, defaulting to "Other".
	function normalizeCategory(value) {
		return ALLOWED_CATEGORIES.indexOf(value) !== -1 ? value : 'Other';
	}

	// Apply search, filter and sort to a given posts array.
	function applyQuery(posts) {
		let q = (searchInput.value || '').toLowerCase();
		let cat = categoryFilter.value || '';
		let filtered = posts.filter(function (p) {
			let matchesText = !q || (p.title.toLowerCase().indexOf(q) !== -1) || (p.content.toLowerCase().indexOf(q) !== -1) || (p.category && p.category.toLowerCase().indexOf(q) !== -1);
			let matchesCat = !cat || p.category === cat;
			return matchesText && matchesCat;
		});
		let sort = sortSelect.value || 'newest';
		filtered.sort(function (a, b) {
			if (sort === 'newest') return b.createdAt - a.createdAt;
			if (sort === 'oldest') return a.createdAt - b.createdAt;
			if (sort === 'title-asc') return a.title.localeCompare(b.title);
			if (sort === 'title-desc') return b.title.localeCompare(a.title);
			return 0;
		});
		return filtered;
	}

	/*
	 Render posts list into the DOM. Adds clamped preview and calls-to-action
	 (Show more and Read full post) for long content.
	*/
	function renderPosts() {
		let posts = applyQuery(loadPosts());
		postsList.innerHTML = '';

		if (!posts.length) {
			postsEmpty.hidden = false;
			return;
		}

		postsEmpty.hidden = true;

		posts.forEach(function (post) {
			let li = document.createElement('li');
			li.className = 'post';

			let header = document.createElement('header');
			let titleWrap = document.createElement('div');
			let titleEl = document.createElement('div');
			titleEl.className = 'post-title';
			let link = document.createElement('a');
			link.href = 'post.html?id=' + encodeURIComponent(post.id);
			link.textContent = post.title;
			link.style.textDecoration = 'none';
			link.style.color = 'inherit';
			titleEl.appendChild(link);
			let metaEl = document.createElement('div');
			metaEl.className = 'post-meta';
			if (post.category) {
				let badge = document.createElement('span');
				badge.className = 'badge';
				badge.textContent = post.category;
				metaEl.appendChild(badge);
			}
			let date = new Date(post.createdAt);
			let dateSpan = document.createElement('span');
			dateSpan.textContent = date.toLocaleString();
			metaEl.appendChild(dateSpan);
			titleWrap.appendChild(titleEl);
			titleWrap.appendChild(metaEl);

			let actions = document.createElement('div');
			actions.className = 'post-actions';

			let editBtn = document.createElement('button');
			editBtn.className = 'secondary';
			editBtn.textContent = 'Edit';
			editBtn.addEventListener('click', function () { startEdit(post.id); });

			let deleteBtn = document.createElement('button');
			deleteBtn.className = 'secondary';
			deleteBtn.textContent = 'Delete';
			deleteBtn.addEventListener('click', function () { removePost(post.id); });

			actions.appendChild(editBtn);
			actions.appendChild(deleteBtn);

			header.appendChild(titleWrap);
			header.appendChild(actions);

			let contentEl = document.createElement('div');
			contentEl.className = 'post-content';
			contentEl.textContent = post.content;

			// Clamp long content and add toggle + read-more link
			let isLong = (post.content || '').length > 600 || (post.content || '').split('\n').length > 12;
			if (isLong) {
				contentEl.classList.add('collapsed');
				let toggle = document.createElement('button');
				toggle.className = 'small secondary';
				toggle.type = 'button';
				toggle.textContent = 'Show more';
				toggle.addEventListener('click', function () {
					let collapsed = contentEl.classList.toggle('collapsed');
					toggle.textContent = collapsed ? 'Show more' : 'Show less';
				});
				let readMore = document.createElement('a');
				readMore.href = 'post.html?id=' + encodeURIComponent(post.id);
				readMore.className = 'read-more';
				readMore.textContent = 'Read full post →';
				li.appendChild(toggle);
				li.appendChild(readMore);
			}

			li.appendChild(header);
			li.appendChild(contentEl);
			postsList.appendChild(li);
		});
	}

	//Reset form to create mode and focus title.
	function clearForm() {
		hiddenIdInput.value = '';
		titleInput.value = '';
		contentInput.value = '';
		if (categoryInput) categoryInput.value = 'Other';
		cancelEditBtn.hidden = true;
		document.getElementById('saveBtn').textContent = 'Save Post';
		titleInput.focus();
	}

	//Load a post into the form for editing.
	function startEdit(id) {
		let posts = loadPosts();
		let post = posts.find(function (p) { return p.id === id; });
		if (!post) return;
		hiddenIdInput.value = String(post.id);
		titleInput.value = post.title;
		contentInput.value = post.content;
		if (categoryInput) categoryInput.value = normalizeCategory(post.category || 'Other');
		cancelEditBtn.hidden = false;
		document.getElementById('saveBtn').textContent = 'Update Post';
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	//Delete a post by id with confirmation, then re-render.
	function removePost(id) {
		if (!confirm('Delete this post?')) return;
		let posts = loadPosts();
		let next = posts.filter(function (p) { return p.id !== id; });
		savePosts(next);
		populateCategoryFilter();
		renderPosts();
	}

	//Create (when id null) or update an existing post, then persist.
	function upsertPost(id, title, content, category) {
		let posts = loadPosts();
		let normalized = normalizeCategory(category || 'Other');
		if (id) {
			let idx = posts.findIndex(function (p) { return p.id === id; });
			if (idx !== -1) {
				posts[idx].title = title;
				posts[idx].content = content;
				posts[idx].category = normalized;
				savePosts(posts);
				return;
			}
		}
		let now = Date.now();
		let newPost = {
			id: now,
			title: title,
			content: content,
			category: normalized,
			createdAt: now
		};
		posts.unshift(newPost);
		savePosts(posts);
	}

	//Apply theme class to <html> and remember choice.
	function applyTheme(theme) {
		let root = document.documentElement;
		if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
		localStorage.setItem(THEME_KEY, theme);
	}

	//Initialize theme from saved value or system preference.
	function initTheme() {
		let saved = localStorage.getItem(THEME_KEY);
		if (saved === 'dark' || saved === 'light') {
			applyTheme(saved);
			return saved;
		}
		let prefersDark = false;
		try { prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (_) {}
		let initial = prefersDark ? 'dark' : 'light';
		applyTheme(initial);
		return initial;
	}

	// Create/Update submit handler
	form.addEventListener('submit', function (e) {
		e.preventDefault();
		let title = titleInput.value.trim();
		let content = contentInput.value.trim();
		let category = categoryInput ? categoryInput.value : 'Other';
		if (!title || !content) return;
		let id = hiddenIdInput.value ? Number(hiddenIdInput.value) : null;
		upsertPost(id, title, content, category);
		clearForm();
		populateCategoryFilter();
		renderPosts();
	});

	// UI events
	cancelEditBtn.addEventListener('click', function () {
		clearForm();
	});

	searchInput.addEventListener('input', renderPosts);
	categoryFilter.addEventListener('change', renderPosts);
	sortSelect.addEventListener('change', renderPosts);

	exportBtn.addEventListener('click', function () {
		let data = JSON.stringify(loadPosts(), null, 2);
		let blob = new Blob([data], { type: 'application/json' });
		let url = URL.createObjectURL(blob);
		let a = document.createElement('a');
		a.href = url;
		a.download = 'mini-blog-export.json';
		document.body.appendChild(a);
		a.click();
		setTimeout(function () {
			URL.revokeObjectURL(url);
			document.body.removeChild(a);
		}, 0);
	});

	importBtn.addEventListener('click', function () { importFile.click(); });
	importFile.addEventListener('change', function () {
		let file = importFile.files && importFile.files[0];
		if (!file) return;
		let reader = new FileReader();
		reader.onload = function () {
			try {
				let parsed = JSON.parse(String(reader.result || '[]'));
				if (!Array.isArray(parsed)) throw new Error('Invalid file');
				savePosts(parsed);
				populateCategoryFilter();
				renderPosts();
				alert('Import successful.');
			} catch (err) {
				alert('Import failed. Please select a valid JSON export.');
			}
		};
		reader.readAsText(file);
		importFile.value = '';
	});

	clearAllBtn.addEventListener('click', function () {
		if (!confirm('Clear ALL posts? This cannot be undone.')) return;
		savePosts([]);
		populateCategoryFilter();
		renderPosts();
	});

	// Theme toggle wiring
	let currentTheme = initTheme();
	if (themeToggle) {
		themeToggle.addEventListener('click', function () {
			currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
			applyTheme(currentTheme);
		});
	}

	// One-time migration (old storage key -> v2 shape)
	(function migrateV1ToV2() {
		let old = localStorage.getItem('mini_blog_posts_v1');
		if (!old) return;
		try {
			let posts = JSON.parse(old) || [];
			posts.forEach(function (p) { if (!p.createdAt) p.createdAt = Date.now(); if (p.category == null) p.category = ''; });
			savePosts(posts);
			localStorage.removeItem('mini_blog_posts_v1');
		} catch (_) {}
	})();

	// Initial render
	populateCategoryFilter();
	renderPosts();
});
