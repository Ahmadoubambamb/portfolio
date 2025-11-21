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
    if (!token) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured: GITHUB_TOKEN not set' }) };
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
      // Après avoir uploadé l'image, mettre à jour (ou créer) profile.json
      try {
        const profilePath = 'profile.json';
        const profileObj = { photo: `images/${filename}` };
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
          message: `Update profile.json for profile photo: ${filename}`,
          content: profileContent,
          branch: BRANCH
        };
        if (profileSha) putProfileBody.sha = profileSha;

        const putProfileRes = await fetch(putProfileUrl, { method: 'PUT', headers, body: JSON.stringify(putProfileBody) });
        const putProfileJson = await putProfileRes.json().catch(() => ({}));
        // ignore errors from profile update for now, but include in response
        return { statusCode: 200, body: JSON.stringify({ ok: true, result: putJson, profileResult: putProfileJson }) };
      } catch (e) {
        console.error('Error updating profile.json', e);
        return { statusCode: 200, body: JSON.stringify({ ok: true, result: putJson, profileResult: { error: 'failed to update profile.json' } }) };
      }
    }

    return { statusCode: putRes.status || 500, body: JSON.stringify({ error: 'GitHub API error', details: putJson }) };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
