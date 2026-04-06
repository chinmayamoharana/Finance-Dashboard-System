from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import FinancialRecord, User


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    username = serializers.CharField(validators=[])
    email = serializers.EmailField(validators=[])
    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
        style={'input_type': 'password'},
    )

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'name',
            'role',
            'is_active',
            'password',
            'date_joined',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'date_joined', 'created_at', 'updated_at']

    def validate_username(self, value):
        queryset = User.objects.filter(username__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('Username already exists.')
        return value

    def validate_email(self, value):
        queryset = User.objects.filter(email__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('Email already exists.')
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': ['This field is required.']})
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(validators=[])
    email = serializers.EmailField(validators=[])
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'name', 'role', 'password']

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('Username already exists.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Email already exists.')
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class FinancialRecordSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    updated_by = serializers.SerializerMethodField()

    class Meta:
        model = FinancialRecord
        fields = [
            'id',
            'amount',
            'record_type',
            'category',
            'transaction_date',
            'notes',
            'created_by',
            'updated_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'updated_by', 'created_at', 'updated_at']

    def get_created_by(self, obj):
        return {
            'id': obj.created_by_id,
            'username': obj.created_by.username,
            'name': obj.created_by.name,
        }

    def get_updated_by(self, obj):
        if not obj.updated_by:
            return None
        return {
            'id': obj.updated_by_id,
            'username': obj.updated_by.username,
            'name': obj.updated_by.name,
        }


class RecordFilterSerializer(serializers.Serializer):
    record_type = serializers.ChoiceField(
        choices=FinancialRecord.RecordType.choices,
        required=False,
    )
    category = serializers.CharField(required=False, max_length=100)
    search = serializers.CharField(required=False, max_length=100)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    page_size = serializers.IntegerField(required=False, min_value=1, max_value=100, default=10)

    def validate(self, attrs):
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                {'end_date': ['End date must be greater than or equal to start date.']}
            )
        return attrs


class DashboardFilterSerializer(serializers.Serializer):
    record_type = serializers.ChoiceField(
        choices=FinancialRecord.RecordType.choices,
        required=False,
    )
    category = serializers.CharField(required=False, max_length=100)
    search = serializers.CharField(required=False, max_length=100)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)

    def validate(self, attrs):
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                {'end_date': ['End date must be greater than or equal to start date.']}
            )
        return attrs
