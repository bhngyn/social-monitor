"""Seed database with mock data for UI development without API keys."""

import os
import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

# Use sync engine for seeding
db_url = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://social_monitor:change_me_in_production@db:5432/social_monitor",
).replace("postgresql+asyncpg://", "postgresql://")

engine = create_engine(db_url)

PLATFORMS = ["twitter", "instagram", "facebook", "tiktok", "youtube"]

SAMPLE_ACCOUNTS = [
    ("twitter", "presidente_mx", "Presidente de México", "https://twitter.com/presidente_mx"),
    ("twitter", "noticiasmx", "Noticias México", "https://twitter.com/noticiasmx"),
    ("instagram", "gobiernocdmx", "Gobierno CDMX", "https://www.instagram.com/gobiernocdmx/"),
    ("instagram", "noticieros_tv", "Noticieros TV", "https://www.instagram.com/noticieros_tv/"),
    ("facebook", "senaborepublica", "Senado República", "https://www.facebook.com/senaborepublica"),
    ("tiktok", "politica_mx", "Política MX", None),
    ("youtube", "congresomx", "Congreso México", "https://www.youtube.com/@congresomx"),
]

SAMPLE_TEXTS_ES = [
    "Hoy anunciamos nuevas medidas para fortalecer la seguridad en las comunidades más vulnerables del país. #Seguridad #México",
    "La inversión en infraestructura educativa ha crecido un 45% este año. Más escuelas, mejores oportunidades para nuestros niños.",
    "Reunión con representantes de la sociedad civil para discutir las reformas al sistema de salud. El diálogo es fundamental.",
    "El programa de apoyo a pequeñas y medianas empresas ya beneficia a más de 500,000 negocios en todo el territorio nacional.",
    "Celebramos el Día de la Constitución recordando los valores democráticos que nos unen como nación. 🇲🇽",
    "Nueva línea del metro entrará en operación el próximo mes. Mejorando la movilidad para millones de ciudadanos.",
    "Los resultados preliminares de la encuesta muestran un aumento en la confianza ciudadana hacia las instituciones públicas.",
    "Conferencia de prensa sobre los avances en la estrategia nacional contra el cambio climático. Transmisión en vivo.",
    "Se aprobó la nueva ley de transparencia que fortalece el derecho de los ciudadanos a la información pública.",
    "Importante acuerdo comercial con países de la región. Más oportunidades de exportación para productores mexicanos.",
    "El sector turístico registra cifras récord. México se posiciona como uno de los destinos más visitados del mundo.",
    "Programa de vacunación avanza con éxito. Ya se han aplicado más de 10 millones de dosis en todo el país.",
    "Inauguración del nuevo hospital regional. Atención médica de calidad más cerca de las comunidades rurales.",
    "Los jóvenes son el motor del cambio. Nuevas becas disponibles para estudiantes universitarios de bajos recursos.",
    "Operativo exitoso contra el crimen organizado en la frontera norte. Decomiso de más de 2 toneladas de sustancias ilegales.",
]

SAMPLE_YOUTUBE_TITLES = [
    "Sesión ordinaria del Congreso - Debate sobre reforma energética",
    "Conferencia matutina del presidente - 15 de marzo 2024",
    "Comparecencia del Secretario de Economía ante el Senado",
    "Foro: El futuro de la educación en México",
    "Informe trimestral de gobierno - Tercer trimestre 2024",
]


def seed():
    from app.models.source import Source
    from app.models.post import Post
    from app.models.media import MediaFile
    from app.models.topic_set import TopicSet, SetMembership
    from app.models.ingestion_run import IngestionRun
    from app.models.audit import AuditLog
    from app.models.note import PostNote
    from app.models.alert import Alert

    with Session(engine) as session:
        print("Seeding sources...")
        sources = []
        for platform, username, display_name, profile_url in SAMPLE_ACCOUNTS:
            source = Source(
                platform=platform,
                platform_id=username,
                username=username,
                display_name=display_name,
                profile_url=profile_url,
                is_active=True,
                poll_interval=3600,
                last_polled_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 24)),
            )
            session.add(source)
            sources.append(source)
        session.flush()

        print("Seeding posts...")
        all_posts = []
        for source in sources:
            num_posts = random.randint(15, 40)
            for i in range(num_posts):
                post_id = f"{source.username}_{uuid.uuid4().hex[:8]}"
                days_ago = random.randint(0, 60)
                hours_ago = random.randint(0, 23)

                if source.platform == "youtube":
                    text = random.choice(SAMPLE_YOUTUBE_TITLES)
                else:
                    text = random.choice(SAMPLE_TEXTS_ES)

                engagement = {}
                if source.platform == "twitter":
                    engagement = {
                        "likes": random.randint(50, 50000),
                        "retweets": random.randint(10, 10000),
                        "replies": random.randint(5, 2000),
                        "quotes": random.randint(0, 500),
                        "bookmarks": random.randint(0, 2000),
                        "views": random.randint(1000, 500000),
                    }
                elif source.platform == "instagram":
                    engagement = {
                        "likes": random.randint(100, 100000),
                        "comments": random.randint(10, 5000),
                        "views": random.randint(0, 200000) if random.random() > 0.5 else 0,
                    }
                elif source.platform == "tiktok":
                    engagement = {
                        "likes": random.randint(500, 200000),
                        "comments": random.randint(50, 10000),
                        "shares": random.randint(10, 5000),
                        "views": random.randint(10000, 2000000),
                        "saves": random.randint(10, 3000),
                    }
                elif source.platform == "youtube":
                    engagement = {
                        "views": random.randint(5000, 500000),
                        "likes": random.randint(100, 20000),
                        "comments": random.randint(20, 3000),
                    }
                elif source.platform == "facebook":
                    engagement = {
                        "reactions": random.randint(100, 30000),
                        "comments": random.randint(20, 2000),
                        "shares": random.randint(5, 1000),
                        "reactions_breakdown": {
                            "like": random.randint(50, 20000),
                            "love": random.randint(10, 5000),
                            "haha": random.randint(0, 500),
                            "wow": random.randint(0, 200),
                            "sad": random.randint(0, 100),
                            "angry": random.randint(0, 100),
                        },
                    }

                platform_data = {}
                if source.platform == "twitter":
                    platform_data = {
                        "is_retweet": random.random() < 0.1,
                        "is_quote": random.random() < 0.05,
                        "is_reply": random.random() < 0.15,
                        "hashtags": ["México", "Gobierno"] if random.random() > 0.5 else [],
                        "mentions": [],
                        "language": "es",
                        "source_app": "Twitter Web App",
                    }
                elif source.platform == "instagram":
                    pt = random.choice(["feed", "clips", "carousel_container"])
                    platform_data = {
                        "productType": pt,
                        "isVideo": pt == "clips",
                        "isSponsored": random.random() < 0.05,
                        "hashtags": ["mexico", "politica"] if random.random() > 0.5 else [],
                        "mentions": [],
                    }
                elif source.platform == "tiktok":
                    platform_data = {
                        "textLanguage": "es",
                        "locationCreated": "MX",
                        "isAd": False,
                        "isPinned": random.random() < 0.1,
                        "hashtags": [{"name": "mexico"}, {"name": "politica"}] if random.random() > 0.5 else [],
                        "videoMeta": {"width": 1080, "height": 1920, "duration": random.randint(10, 180)},
                        "musicMeta": {"musicName": "Original Sound", "musicAuthor": source.username},
                    }
                elif source.platform == "youtube":
                    platform_data = {
                        "channel": {"name": source.display_name, "handle": f"@{source.username}"},
                        "durationSeconds": random.randint(120, 7200),
                        "category": "News & Politics",
                        "tags": ["México", "Congreso", "Política"],
                        "isLiveVideo": random.random() < 0.2,
                        "isShortsVideo": random.random() < 0.1,
                    }
                elif source.platform == "facebook":
                    platform_data = {
                        "postType": random.choice(["status", "photo", "video", "link"]),
                        "isGroupPost": False,
                        "isShared": random.random() < 0.1,
                    }

                post = Post(
                    source_id=source.id,
                    platform=source.platform,
                    platform_post_id=post_id,
                    post_url=f"https://{source.platform}.com/{source.username}/post/{post_id}",
                    text_content=text,
                    post_timestamp=datetime.now(timezone.utc) - timedelta(days=days_ago, hours=hours_ago),
                    engagement=engagement,
                    platform_data=platform_data,
                    raw_metadata={"seed": True, "source": source.username},
                    media_downloaded=random.random() > 0.3,
                    mhtml_captured=random.random() > 0.3,
                    screenshot_captured=random.random() > 0.3,
                    hashes_computed=random.random() > 0.4,
                )
                session.add(post)
                all_posts.append(post)
        session.flush()

        print("Seeding topic sets...")
        sets_data = [
            ("Elecciones 2024", "Posts related to the 2024 elections", "#EF4444"),
            ("Seguridad Pública", "Security and crime-related posts", "#F59E0B"),
            ("Economía", "Economic policy and trade", "#10B981"),
            ("Educación", "Education policy and reforms", "#3B82F6"),
            ("Salud", "Healthcare and public health", "#8B5CF6"),
        ]
        topic_sets = []
        for name, desc, color in sets_data:
            ts = TopicSet(name=name, description=desc, color=color)
            session.add(ts)
            topic_sets.append(ts)
        session.flush()

        # Assign some posts to sets
        for ts in topic_sets:
            sample_posts = random.sample(all_posts, min(random.randint(5, 20), len(all_posts)))
            for post in sample_posts:
                membership = SetMembership(set_id=ts.id, post_id=post.id)
                session.add(membership)

        print("Seeding ingestion runs...")
        for source in sources:
            for i in range(3):
                run = IngestionRun(
                    source_id=source.id,
                    trigger_type=random.choice(["scheduled", "manual"]),
                    status="completed",
                    posts_found=random.randint(5, 30),
                    posts_new=random.randint(0, 10),
                    started_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 72)),
                    completed_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(0, 71)),
                )
                session.add(run)

        print("Seeding alerts...")
        alerts = [
            Alert(name="Election Keywords", keyword_pattern="elecciones|votación|candidato", notify_via="browser"),
            Alert(name="Security Incidents", keyword_pattern="crimen|seguridad|operativo", notify_via="browser"),
        ]
        for alert in alerts:
            session.add(alert)

        print("Seeding notes...")
        for post in random.sample(all_posts, min(20, len(all_posts))):
            note = PostNote(post_id=post.id, text=random.choice([
                "Review this post - potential relevance to current investigation",
                "Important context for the economic reform analysis",
                "Follow up on this account's activity patterns",
                "Cross-reference with media coverage from same date",
                "Notable change in engagement compared to previous posts",
            ]))
            session.add(note)

        print("Seeding profile snapshots...")
        from app.models.profile_snapshot import ProfileSnapshot
        for source in sources:
            for weeks_ago in [4, 2, 0]:
                snap = ProfileSnapshot(
                    source_id=source.id,
                    bio=f"Cuenta oficial de {source.display_name}",
                    follower_count=random.randint(10000, 5000000) + (4 - weeks_ago) * random.randint(100, 5000),
                    following_count=random.randint(100, 2000),
                    post_count=random.randint(500, 10000),
                    avatar_url=None,
                    is_verified=random.random() > 0.3,
                    snapshot_at=datetime.now(timezone.utc) - timedelta(weeks=weeks_ago),
                )
                session.add(snap)

        print("Seeding expanded links...")
        from app.models.link import ExpandedLink
        for post in random.sample(all_posts, min(30, len(all_posts))):
            session.add(ExpandedLink(
                post_id=post.id,
                short_url=f"https://t.co/{uuid.uuid4().hex[:10]}",
                expanded_url=random.choice([
                    "https://www.gob.mx/presidencia/articulos/informe-trimestral",
                    "https://www.dof.gob.mx/nota_detalle.php?codigo=5678901",
                    "https://www.senado.gob.mx/sesion-ordinaria-2024",
                    "https://www.reuters.com/world/americas/mexico-economy-2024",
                    "https://expansion.mx/politica/reforma-energetica-2024",
                ]),
                domain=random.choice(["gob.mx", "dof.gob.mx", "senado.gob.mx", "reuters.com", "expansion.mx"]),
            ))

        print("Seeding audit log...")
        for post in all_posts[:50]:
            session.add(AuditLog(
                event_type="post_first_seen",
                entity_type="post",
                entity_id=str(post.id),
                details={"platform": post.platform, "source": post.source_id and str(post.source_id)},
            ))
        for source in sources:
            session.add(AuditLog(
                event_type="source_added",
                entity_type="source",
                entity_id=str(source.id),
                details={"platform": source.platform, "username": source.username},
            ))

        session.commit()
        print(f"Seeded: {len(sources)} sources, {len(all_posts)} posts, {len(topic_sets)} sets, {len(alerts)} alerts")
        print("Done!")


if __name__ == "__main__":
    seed()
