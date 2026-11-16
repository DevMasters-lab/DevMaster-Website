<?php

namespace Tests\Feature;

use App\Models\PublicPage;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class OptionalPublicPageTest extends TestCase
{
    use DatabaseTransactions;

    public function test_optional_lookup_returns_200_with_null_when_no_published_page_exists(): void
    {
        $this->getJson('/api/v1/pages/optional-missing-cms-page?optional=1')
            ->assertOk()
            ->assertExactJson(['data' => null]);
    }

    public function test_optional_lookup_does_not_expose_unpublished_content(): void
    {
        $editor = User::factory()->create();
        PublicPage::create([
            'slug' => 'optional-draft-cms-page',
            'locale' => 'en',
            'title' => 'Unpublished title',
            'body_markdown' => 'Unpublished body',
            'status' => 'DRAFT',
            'updated_by_user_id' => $editor->id,
        ]);

        $this->getJson('/api/v1/pages/optional-draft-cms-page?optional=1')
            ->assertOk()
            ->assertExactJson(['data' => null]);
    }

    public function test_optional_lookup_returns_published_english_content_as_locale_fallback(): void
    {
        $editor = User::factory()->create();
        PublicPage::create([
            'slug' => 'optional-published-cms-page',
            'locale' => 'en',
            'title' => 'Published CMS title',
            'body_markdown' => 'Published CMS body',
            'status' => 'PUBLISHED',
            'published_at' => '2026-11-01 00:00:00',
            'updated_by_user_id' => $editor->id,
        ]);

        $this->withHeader('X-Locale', 'km')->getJson('/api/v1/pages/optional-published-cms-page?optional=1')
            ->assertOk()
            ->assertJsonPath('data.locale', 'en')
            ->assertJsonPath('data.title', 'Published CMS title')
            ->assertJsonPath('data.body_markdown', 'Published CMS body');
    }

    public function test_disabled_optional_lookup_preserves_404_for_a_missing_page(): void
    {
        $this->getJson('/api/v1/pages/optional-missing-cms-page?optional=0')
            ->assertNotFound()
            ->assertJsonPath('code', 'NOT_FOUND');
    }
}
