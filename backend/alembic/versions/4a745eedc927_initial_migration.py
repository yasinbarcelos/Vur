"""Initial migration

Revision ID: 4a745eedc927
Revises: 
Create Date: 2025-06-12 10:53:31.127700

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4a745eedc927'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=100), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('profile_picture', sa.String(length=500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_superuser', sa.Boolean(), nullable=False),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # Create datasets table
    op.create_table('datasets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=True),
        sa.Column('dataset_type', sa.Enum('TIME_SERIES', 'TABULAR', 'OTHER', name='datasettype'), nullable=False),
        sa.Column('status', sa.Enum('UPLOADED', 'PROCESSING', 'VALIDATED', 'ERROR', 'ARCHIVED', name='datasetstatus'), nullable=False),
        sa.Column('columns_info', sa.JSON(), nullable=True),
        sa.Column('row_count', sa.Integer(), nullable=True),
        sa.Column('validation_errors', sa.JSON(), nullable=True),
        sa.Column('dataset_metadata', sa.JSON(), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_datasets_id'), 'datasets', ['id'], unique=False)
    op.create_index(op.f('ix_datasets_name'), 'datasets', ['name'], unique=False)
    op.create_index(op.f('ix_datasets_owner_id'), 'datasets', ['owner_id'], unique=False)
    op.create_index(op.f('ix_datasets_status'), 'datasets', ['status'], unique=False)

    # Create pipelines table
    op.create_table('pipelines',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('pipeline_type', sa.Enum('UNIVARIATE', 'MULTIVARIATE', name='pipelinetype'), nullable=False),
        sa.Column('status', sa.Enum('CREATED', 'CONFIGURING', 'TRAINING', 'COMPLETED', 'FAILED', 'ARCHIVED', name='pipelinestatus'), nullable=False),
        sa.Column('configuration', sa.JSON(), nullable=True),
        sa.Column('target_column', sa.String(length=100), nullable=True),
        sa.Column('date_column', sa.String(length=100), nullable=True),
        sa.Column('features', sa.JSON(), nullable=True),
        sa.Column('algorithm', sa.String(length=50), nullable=True),
        sa.Column('hyperparameters', sa.JSON(), nullable=True),
        sa.Column('metrics', sa.JSON(), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('dataset_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['dataset_id'], ['datasets.id'], ),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pipelines_dataset_id'), 'pipelines', ['dataset_id'], unique=False)
    op.create_index(op.f('ix_pipelines_id'), 'pipelines', ['id'], unique=False)
    op.create_index(op.f('ix_pipelines_name'), 'pipelines', ['name'], unique=False)
    op.create_index(op.f('ix_pipelines_owner_id'), 'pipelines', ['owner_id'], unique=False)
    op.create_index(op.f('ix_pipelines_status'), 'pipelines', ['status'], unique=False)

    # Create models table
    op.create_table('models',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('algorithm', sa.Enum('ARIMA', 'SARIMA', 'PROPHET', 'LSTM', 'GRU', 'RANDOM_FOREST', 'XGBOOST', 'LINEAR_REGRESSION', 'SVR', 'TRANSFORMER', 'CUSTOM', name='modelalgorithm'), nullable=False),
        sa.Column('status', sa.Enum('CREATED', 'TRAINING', 'TRAINED', 'DEPLOYED', 'FAILED', 'ARCHIVED', name='modelstatus'), nullable=False),
        sa.Column('version', sa.String(length=20), nullable=False),
        sa.Column('model_path', sa.String(length=500), nullable=True),
        sa.Column('model_size', sa.Integer(), nullable=True),
        sa.Column('hyperparameters', sa.JSON(), nullable=True),
        sa.Column('training_metrics', sa.JSON(), nullable=True),
        sa.Column('validation_metrics', sa.JSON(), nullable=True),
        sa.Column('test_metrics', sa.JSON(), nullable=True),
        sa.Column('feature_importance', sa.JSON(), nullable=True),
        sa.Column('training_duration', sa.Float(), nullable=True),
        sa.Column('pipeline_id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['pipeline_id'], ['pipelines.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_models_algorithm'), 'models', ['algorithm'], unique=False)
    op.create_index(op.f('ix_models_id'), 'models', ['id'], unique=False)
    op.create_index(op.f('ix_models_name'), 'models', ['name'], unique=False)
    op.create_index(op.f('ix_models_owner_id'), 'models', ['owner_id'], unique=False)
    op.create_index(op.f('ix_models_pipeline_id'), 'models', ['pipeline_id'], unique=False)
    op.create_index(op.f('ix_models_status'), 'models', ['status'], unique=False)

    # Create predictions table
    op.create_table('predictions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('prediction_type', sa.Enum('SINGLE_STEP', 'MULTI_STEP', 'BATCH', name='predictiontype'), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'COMPLETED', 'FAILED', name='predictionstatus'), nullable=False),
        sa.Column('predicted_value', sa.Float(), nullable=False),
        sa.Column('confidence_lower', sa.Float(), nullable=True),
        sa.Column('confidence_upper', sa.Float(), nullable=True),
        sa.Column('prediction_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('input_features', sa.JSON(), nullable=True),
        sa.Column('prediction_metadata', sa.JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('model_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['model_id'], ['models.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_predictions_id'), 'predictions', ['id'], unique=False)
    op.create_index(op.f('ix_predictions_model_id'), 'predictions', ['model_id'], unique=False)
    op.create_index(op.f('ix_predictions_prediction_date'), 'predictions', ['prediction_date'], unique=False)
    op.create_index(op.f('ix_predictions_status'), 'predictions', ['status'], unique=False)

    # Create monitoring table
    op.create_table('monitoring',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('service_name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.Enum('SYSTEM', 'APPLICATION', 'DATABASE', 'ML_PIPELINE', 'API', 'SECURITY', name='monitoringcategory'), nullable=False),
        sa.Column('level', sa.Enum('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL', name='monitoringlevel'), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('metrics', sa.JSON(), nullable=True),
        sa.Column('monitoring_metadata', sa.JSON(), nullable=True),
        sa.Column('duration', sa.Float(), nullable=True),
        sa.Column('error_details', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_monitoring_category'), 'monitoring', ['category'], unique=False)
    op.create_index(op.f('ix_monitoring_created_at'), 'monitoring', ['created_at'], unique=False)
    op.create_index(op.f('ix_monitoring_id'), 'monitoring', ['id'], unique=False)
    op.create_index(op.f('ix_monitoring_level'), 'monitoring', ['level'], unique=False)
    op.create_index(op.f('ix_monitoring_service_name'), 'monitoring', ['service_name'], unique=False)
    op.create_index(op.f('ix_monitoring_status'), 'monitoring', ['status'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('monitoring')
    op.drop_table('predictions')
    op.drop_table('models')
    op.drop_table('pipelines')
    op.drop_table('datasets')
    op.drop_table('users')
