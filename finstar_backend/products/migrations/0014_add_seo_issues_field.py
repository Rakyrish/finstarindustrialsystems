from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0013_add_image_protection_and_watermark'),
    ]

    operations = [
        migrations.AddField(
            model_name='productseo',
            name='seo_issues',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
