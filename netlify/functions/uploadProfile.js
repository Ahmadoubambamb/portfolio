exports.handler = async (event, context) => {
  // Cette function attend un POST avec un JSON: { filename: string, content: base64-string }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { filename, content } = body;

    if (!filename || !content) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing filename or content' }) };
    }

    const GITHUB_OWNER = 'Ahmadoubambamb';
    const GITHUB_REPO = 'portfolio';
    const BRANCH = 'main';
    const path = `images/${filename}`;

    const token = process.env.GITHUB_TOKEN;
    const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dqd3icdk4';
    const CLOUD_KEY = process.env.CLOUDINARY_API_KEY;
    const CLOUD_SECRET = process.env.CLOUDINARY_API_SECRET;
    if (!token) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured: GITHUB_TOKEN not set' }) };
    }

    if (!CLOUD_KEY || !CLOUD_SECRET) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured: CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET not set' }) };
    }

    const headers = {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    };

    // Vérifier si le fichier existe pour récupérer le sha
    const getUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`;
    let sha = null;
    try {
      const getRes = await fetch(getUrl, { headers });
      if (getRes.status === 200) {
        const j = await getRes.json();
        sha = j.sha;
      }
    } catch (e) {
      // ignore - si le fichier n'existe pas on crée
    }

    const putUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path)}`;
    const putBody = {
      message: `Update profile photo: ${filename}`,
      content: content,
      branch: BRANCH
    };
    if (sha) putBody.sha = sha;

    const putRes = await fetch(putUrl, { method: 'PUT', headers, body: JSON.stringify(putBody) });
    const putJson = await putRes.json().catch(() => ({}));

    if (putRes.status === 201 || putRes.status === 200) {
      // Nous avons mis le fichier dans le repo (si applicable) — maintenant uploader sur Cloudinary
      try {
        // Détecter le mime type à partir du filename
        const ext = filename.split('.').pop().toLowerCase();
        const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
        const mime = mimeMap[ext] || 'application/octet-stream';

        // Préparer la donnée sous forme data URL
        const dataUrl = `data:${mime};base64,${content}`;

        // Construire le body multipart/form-data manuellement
        const boundary = '----CloudinaryFormBoundary' + Date.now();
        let multipartBody = '';
        multipartBody += `--${boundary}\r\n`;
        multipartBody += `Content-Disposition: form-data; name="file"\r\n\r\n`;
        multipartBody += dataUrl + `\r\n`;
        multipartBody += `--${boundary}\r\n`;
        multipartBody += `Content-Disposition: form-data; name="public_id"\r\n\r\n`;
        multipartBody += `profile/${filename.replace(/\.[^/.]+$/, '')}` + `\r\n`;
        multipartBody += `--${boundary}--\r\n`;

        const cloudUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
        const auth = Buffer.from(`${CLOUD_KEY}:${CLOUD_SECRET}`).toString('base64');

        const cloudRes = await fetch(cloudUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
          },
          body: multipartBody
        });

        const cloudJson = await cloudRes.json().catch(() => ({}));
        if (!cloudRes.ok) {
          console.error('Cloudinary upload failed', cloudJson);
          return { statusCode: 500, body: JSON.stringify({ error: 'Cloudinary upload failed', details: cloudJson }) };
        }

        const imageUrl = cloudJson.secure_url;

        // Mettre à jour profile.json dans le repo (ou créer)
        try {
          const profilePath = 'profile.json';
          const profileObj = { photo: imageUrl };
          const profileContent = Buffer.from(JSON.stringify(profileObj)).toString('base64');

          // Vérifier si profile.json existe
          let profileSha = null;
          try {
            const getProfileUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(profilePath)}?ref=${BRANCH}`;
            const getProfileRes = await fetch(getProfileUrl, { headers });
            if (getProfileRes.status === 200) {
              const pj = await getProfileRes.json();
              profileSha = pj.sha;
            }
          } catch (e) {
            // ignore
          }

          const putProfileUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(profilePath)}`;
          const putProfileBody = {
            message: `Update profile.json for profile photo (Cloudinary): ${filename}`,
            content: profileContent,
            branch: BRANCH
          };
          if (profileSha) putProfileBody.sha = profileSha;

          const putProfileRes = await fetch(putProfileUrl, { method: 'PUT', headers, body: JSON.stringify(putProfileBody) });
          const putProfileJson = await putProfileRes.json().catch(() => ({}));

          return { statusCode: 200, body: JSON.stringify({ ok: true, cloud: cloudJson, profileResult: putProfileJson }) };
        } catch (e) {
          console.error('Error updating profile.json', e);
          return { statusCode: 200, body: JSON.stringify({ ok: true, cloud: cloudJson, profileResult: { error: 'failed to update profile.json' } }) };
        }

      } catch (e) {
        console.error('Cloudinary error', e);
        return { statusCode: 500, body: JSON.stringify({ error: 'Cloudinary upload error', details: String(e) }) };
      }
    }

    return { statusCode: putRes.status || 500, body: JSON.stringify({ error: 'GitHub API error', details: putJson }) };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
